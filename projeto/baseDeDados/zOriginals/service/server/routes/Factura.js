import express from "express";
import Factura from "../models/Factura.js";
import { openingHours } from "../middleware/middleware.js";
import codFactura from "../models/codigoFactura.js";
import clientes from "../models/clientes.js";
import Cupones from "../models/cupones.js";
import Negocio from "../models/negocio.js";
import db from "../config/db.js";
import moment from "moment";
import Anular from "../models/anular.js";
import Almacen from "../models/almacen.js";
import Servicio from "../models/portafolio/servicios.js";
import Producto from "../models/portafolio/productos.js";

import Pagos from "../models/pagos.js";

import {
  handleGetInfoDelivery,
  mapArrayByKey,
  mapObjectByKey,
} from "../utils/utilsFuncion.js";
import { handleAddPago } from "./pagos.js";
import { handleAddGasto } from "./gastos.js";
import Usuarios from "../models/usuarios/usuarios.js";

const router = express.Router();

async function handleAddFactura(data, session) {
  const { infoOrden, infoPago } = data;
  const {
    codRecibo,
    dateRecepcion,
    Modalidad,
    Nombre,
    idCliente,
    Items,
    celular,
    direccion,
    datePrevista,
    dateEntrega,
    dateRecojo,
    descuento,
    estado,
    dni,
    subTotal,
    totalNeto,
    cargosExtras,
    modeRegistro,
    gift_promo,
    attendedBy,
    typeRegistro,
  } = infoOrden;

  let infoCliente;
  let newOrden;
  let newCodigo;
  let newGasto;
  let newPago;

  const fechaActual = moment().format("YYYY-MM-DD");
  const horaActual = moment().format("HH:mm");

  // 1. ADD CLIENTE
  if (estado === "registrado" && !idCliente) {
    const nuevoCliente = new clientes({
      dni,
      nombre: Nombre,
      direccion,
      phone: celular,
      infoScore: [],
      scoreTotal: 0,
    });
    await nuevoCliente.save({ session });

    infoCliente = {
      tipoAction: "add",
      data: nuevoCliente.toObject(),
    };
  }

  // 2. UPDATE CUPON: (SI USO)
  if (
    descuento.estado &&
    descuento.modoDescuento === "Promocion" &&
    descuento.info
  ) {
    if (descuento.info.modo === "CODIGO") {
      const cupon = await Cupones.findOne({
        codigoCupon: descuento.info.codigoCupon,
      });
      if (cupon) {
        cupon.estado = false;
        cupon.dateUse.fecha = fechaActual;
        cupon.dateUse.hora = horaActual;
        await cupon.save({ session });
      }
    }
  }
  // 3. ADD GASTO
  if (Modalidad === "Delivery") {
    if (data.hasOwnProperty("infoGastoByDelivery")) {
      const { infoGastoByDelivery } = data;
      if (Object.keys(infoGastoByDelivery).length) {
        newGasto = await handleAddGasto(infoGastoByDelivery);
      }
    }
  }

  // 4. ADD CUPON
  if (gift_promo.length > 0) {
    for (const gift of gift_promo) {
      const { codigoPromocion, codigoCupon } = gift;

      const nuevoCupon = new Cupones({
        codigoPromocion,
        codigoCupon,
        estado: true,
        dateCreation: {
          fecha: fechaActual,
          hora: horaActual,
        },
        dateUse: {
          fecha: "",
          hora: "",
        },
      });

      await nuevoCupon.save({ session });
    }
  }

  const dateCreation = {
    fecha: fechaActual,
    hora: horaActual,
  };

  let nuevoCodigo;
  if (modeRegistro === "nuevo") {
    const infoCodigo = await codFactura.findOne().sort({ _id: -1 }).lean();
    nuevoCodigo = infoCodigo.codActual;
  } else {
    nuevoCodigo = codRecibo;
  }

  // 5. ADD ORDEN DE SERVICIO
  const nuevoOrden = new Factura({
    codRecibo: nuevoCodigo,
    dateCreation,
    dateRecepcion,
    dateRecojo,
    Modalidad,
    Nombre,
    idCliente: infoCliente ? infoCliente.data._id : idCliente,
    Items,
    celular,
    direccion,
    datePrevista,
    dateEntrega,
    descuento,
    estadoPrenda: "pendiente",
    estado,
    listPago: [],
    dni,
    subTotal,
    totalNeto,
    cargosExtras,
    modeRegistro,
    notas: [],
    gift_promo,
    location: 1,
    attendedBy,
    lastEdit: [],
    typeRegistro,
  });

  newOrden = await nuevoOrden.save({ session });
  newOrden = newOrden.toObject();

  let nuevoPago;
  // 6. ADD PAGO
  if (infoPago) {
    nuevoPago = await handleAddPago(
      {
        ...infoPago,
        idOrden: newOrden._id,
      },
      session
    );
  }

  // 7. UPDATE CLIENTE
  if (
    idCliente &&
    descuento.estado &&
    descuento.info &&
    descuento.modoDescuento === "Puntos"
  ) {
    try {
      // Buscar y actualizar el cliente si existe
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          newOrden.idCliente,
          {
            $push: {
              infoScore: {
                idOrdenService: newOrden._id,
                codigo: newOrden.codRecibo,
                dateService: {
                  fecha: newOrden.dateRecepcion.fecha,
                  hora: newOrden.dateRecepcion.hora,
                },
                score: -descuento.info.puntosUsados, // los puntos en negativo
              },
            },
            $inc: {
              scoreTotal: -descuento.info.puntosUsados, // restar los puntos del total
            },
          },
          { new: true, session }
        )
        .lean();

      // Si el cliente no se encuentra, no se hace nada
      if (!clienteActualizado) {
        console.log("Cliente no encontrado.");
      } else {
        infoCliente = {
          tipoAction: "update",
          data: clienteActualizado,
        };
      }
    } catch (error) {
      console.error("Error al buscar o actualizar el cliente:", error);
      throw new Error("Error al buscar o actualizar el cliente");
    }
  }

  // 8. UPDATE INFO CODIGO
  if (modeRegistro === "nuevo") {
    newCodigo = await codFactura.findOneAndUpdate(
      {},
      { $inc: { codActual: 1 } },
      { new: true, session }
    );

    if (newCodigo) {
      if (newCodigo.codActual > newCodigo.codFinal) {
        newCodigo.codActual = 1;
        await newCodigo.save({ session });
      }
    } else {
      throw new Error("Código de factura no encontrado");
    }
  }

  // 9. UPDATE "listPago" con los ids de los pagos en FACTURA
  if (nuevoPago) {
    // Actualizar la newOrden con los nuevos ids de pago
    await Factura.findByIdAndUpdate(
      newOrden._id,
      { $set: { listPago: [nuevoPago._id] } },
      { session }
    );

    newPago = {
      ...nuevoPago,
      codRecibo: newOrden.codRecibo,
      Nombre: newOrden.Nombre,
      Modalidad: newOrden.Modalidad,
    };
  }

  return {
    newOrder: {
      ...newOrden,
      listPago: newPago ? [newPago._id] : [],
      ListPago: newPago ? [newPago] : [],
    },
    newPago,
    newGasto,
    infoCliente,
    newCodigo,
  };
}

router.post("/add-factura", openingHours, async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const result = await handleAddFactura(req.body, session);
    const { newOrder, newPago, newGasto, infoCliente, newCodigo } = result;

    await session.commitTransaction();
    res.json({
      newOrder,
      ...(newPago && { newPago }),
      ...(newGasto && { newGasto }),
      ...(infoCliente && { changeCliente: infoCliente }),
      ...(newCodigo && { newCodigo: newCodigo.codActual }),
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    await session.abortTransaction();
    res.status(500).json({ mensaje: "Error al guardar los datos" });
  } finally {
    session.endSession();
  }
});

router.get("/get-factura/:id", (req, res) => {
  const { id } = req.params; // Obteniendo el id desde los parámetros de la URL
  Factura.findById(id)
    .then((factura) => {
      if (factura) {
        res.json(factura);
      } else {
        res.status(404).json({ mensaje: "Factura no encontrada" });
      }
    })
    .catch((error) => {
      console.error("Error al obtener los datos:", error);
      res.status(500).json({ mensaje: "Error al obtener los datos" });
    });
});

// Función para buscar facturas y procesar resultados
const handleGetInfoDetallada = async (ordenes) => {
  // Obtener todos los IDs de pagos y donaciones relevantes
  const idsPagos = ordenes.flatMap((orden) => orden.listPago);

  // Consultar todos los pagos
  const pagos = await Pagos.find({ _id: { $in: idsPagos } }).lean();

  // Obtener todos los IDs de usuarios únicos de los pagos
  const idUsers = [...new Set(pagos.map((pago) => pago.idUser))];

  // Buscar la información de los usuarios relacionados con los idUsers
  const usuarios = await Usuarios.find(
    { _id: { $in: idUsers } },
    {
      _id: 1,
      name: 1,
      usuario: 1,
      rol: 1,
    }
  ).lean();

  // Crear un mapa de usuarios por su _id
  const usuariosMap = mapObjectByKey(usuarios, "_id");

  // Crear un mapa de pagos por ID de orden para un acceso más rápido
  const pagosPorOrden = mapArrayByKey(pagos, "idOrden");

  // Procesar cada orden de factura
  const resultados = ordenes.map((orden) => {
    // Obtener los pagos asociados a la orden actual
    const pagosAsociados = pagosPorOrden[orden._id] || [];

    // Mapear cada pago asociado para agregar la información del usuario y detalles de la orden
    const pagosConInfo = pagosAsociados.map((pago) => ({
      infoUser: usuariosMap[pago.idUser],
      codRecibo: orden.codRecibo,
      Nombre: orden.Nombre,
      Modalidad: orden.Modalidad,
      ...pago,
    }));

    // Devolver la orden con la lista de pagos enriquecida
    return {
      ...orden,
      ListPago: pagosConInfo,
    };
  });

  return resultados;
};

router.get("/get-factura/date-range/:startDate/:endDate", async (req, res) => {
  const { startDate, endDate } = req.params;

  try {
    // Buscar todas las facturas dentro del rango de fechas
    const ordenes = await Factura.find({
      $or: [
        { "dateCreation.fecha": { $gte: startDate, $lte: endDate } },
        { estadoPrenda: "pendiente" },
      ],
    }).lean();

    const infoFormateada = await handleGetInfoDetallada(ordenes);
    res.status(200).json(infoFormateada);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

router.get("/get-order/last", async (req, res) => {
  try {
    // Obtener solo el valor de maxConsultasDefault
    const negocio = await Negocio.findOne(
      {},
      { maxConsultasDefault: 1, _id: 0 }
    ).lean();

    // Verificar si el documento de Negocio existe
    if (!negocio) {
      return res
        .status(404)
        .json({ mensaje: "No se encontró el documento de Negocio" });
    }

    const maxConsultasDefault = negocio.maxConsultasDefault;

    // Obtener los últimos documentos
    const ultimos = await Factura.find()
      .sort({ _id: -1 }) // Ordenar por _id en orden descendente para obtener los más recientes
      .limit(maxConsultasDefault) // Limitar la cantidad de documentos
      .lean();

    // Obtener los IDs de los documentos obtenidos
    const ultimosPendientesIds = ultimos
      .filter((factura) => factura.estadoPrenda === "pendiente")
      .map((factura) => factura._id);

    // Obtener los documentos pendientes que no están en los últimos obtenidos
    const pendientes = await Factura.find({
      estadoPrenda: "pendiente",
      _id: { $nin: ultimosPendientesIds }, // Excluir los IDs de los últimos documentos
    }).lean();

    // Combinar ambos conjuntos de documentos
    const ordenes = [...pendientes, ...ultimos];

    // Formatear la información detallada
    const infoFormateada = await handleGetInfoDetallada(ordenes);

    // Enviar respuesta exitosa
    res.status(200).json(infoFormateada);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

router.get("/get-factura/date/:date", async (req, res) => {
  const { date } = req.params;

  // Obtener el primer y último día del mes de la fecha proporcionada
  const startDate = moment(date, "YYYY-MM-DD")
    .startOf("month")
    .format("YYYY-MM-DD");
  const endDate = moment(startDate, "YYYY-MM-DD")
    .endOf("month")
    .format("YYYY-MM-DD");

  try {
    // Buscar todas las facturas que coincidan exactamente con la fecha
    const ordenes = await Factura.find({
      "dateCreation.fecha": {
        $gte: startDate,
        $lte: endDate,
      },
    }).lean();

    const infoFormateada = await handleGetInfoDetallada(ordenes);
    res.status(200).json(infoFormateada);
  } catch (error) {
    console.error("Error al obtener datos: ", error);
    res.status(500).json({ mensaje: "Error interno del servidor" });
  }
});

const generateDateArray = (type, filter) => {
  let fechas = [];

  if (type === "daily") {
    const { days } = filter;
    // Generar fechas para los próximos 3 días
    fechas = Array.from({ length: days }, (_, index) =>
      moment().startOf("day").add(index, "days").format("YYYY-MM-DD")
    );
    return fechas;
  } else {
    if (type === "monthly") {
      const { date } = filter;
      // Generar fechas para todo el mes
      const firstDayOfMonth = moment(date).startOf("month");
      const lastDayOfMonth = moment(date).endOf("month");

      let currentDate = moment(firstDayOfMonth);
      while (currentDate <= lastDayOfMonth) {
        fechas.push(currentDate.format("YYYY-MM-DD"));
        currentDate.add(1, "day");
      }
      return fechas;
    }
  }
};

router.post("/get-report/date-prevista/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const filter = req.body;
    const datesArray = generateDateArray(type, filter);
    const infoReporte = [];

    const infoNegocio = await Negocio.findOne();
    const itemsReporte = infoNegocio.itemsInformeDiario;

    const infoDelivery = await handleGetInfoDelivery();

    itemsReporte.push({
      order: itemsReporte.length,
      id: `SER${infoDelivery._id.toString()}`,
    });

    const splitItem = itemsReporte.map((items) => {
      return {
        ID: items.id.substring(3),
        TIPO: items.id.substring(0, 3),
      };
    });

    let groupedResults = [];

    // Recorremos cada elemento de splitItem
    for (const item of splitItem) {
      try {
        let resultObject = {};
        resultObject.idColumna = item.ID;

        // Si los primeros caracteres son "CAT", busca en la colección categorias
        if (item.TIPO === "CAT") {
          const servicios = await Servicio.find(
            { idCategoria: item.ID },
            "_id"
          );
          const productos = await Producto.find(
            { idCategoria: item.ID },
            "_id"
          );

          const idsServicios = servicios.map((servicio) =>
            servicio._id.toString()
          );
          const idsProductos = productos.map((producto) =>
            producto._id.toString()
          );

          // Combinamos los IDs de servicios y productos
          resultObject.idsCantidades = [...idsServicios, ...idsProductos];
        } else {
          // Si no es "CAT", simplemente agregamos el ID al array
          resultObject.idsCantidades = [item.ID];
        }

        // Agregamos el objeto al array de resultados
        groupedResults.push(resultObject);
      } catch (error) {
        console.error("Error al buscar el documento:", error);
      }
    }

    for (const datePrevista of datesArray) {
      const facturas = await Factura.find({
        "datePrevista.fecha": datePrevista,
        estadoPrenda: { $nin: ["anulado", "donado"] },
      });

      const resultado = {
        FechaPrevista: datePrevista,
        CantidadPedido: facturas.length,
        InfoItems: {},
      };

      // Utiliza Promise.all para esperar a que se completen todas las operaciones asíncronas antes de continuar
      await Promise.all(
        facturas.map(async (factura) => {
          // Recorremos cada factura
          await Promise.all(
            factura.Items.map(async (order) => {
              // Recorremos cada item de la factura

              for (const item of groupedResults) {
                // Verificamos si el identificador está en los idsCantidades de cada grupo
                if (item.idsCantidades.includes(order.identificador)) {
                  // Verificar si resultado.InfoItems[item.idColumna] es un número
                  const existingValue =
                    parseFloat(resultado.InfoItems[item.idColumna]) || 0;
                  // Sumar el valor existente con la cantidad de la orden y formatearlo a 2 decimales
                  resultado.InfoItems[item.idColumna] = (
                    existingValue + Number(order.cantidad)
                  ).toFixed(2);
                }
              }
            })
          );
        })
      );

      resultado.InfoItems = Object.entries(resultado.InfoItems).map(
        ([identificador, Cantidad]) => ({
          identificador,
          Cantidad,
        })
      );

      groupedResults.forEach((group) => {
        // Verifica si la idColumna ya existe en resultado.InfoItems
        const existingItem = resultado.InfoItems.find(
          (item) => item.identificador === group.idColumna
        );

        if (!existingItem) {
          // Si la idColumna no existe, agrega una nueva entrada con cantidad 0
          resultado.InfoItems.push({
            identificador: group.idColumna,
            Cantidad: 0,
          });
        }
      });

      infoReporte.push(resultado);
    }

    res.json(infoReporte);
  } catch (error) {
    console.error("Error al obtener los datos:", error);
    res.status(500).json({ mensaje: "Error al obtener los datos" });
  }
});

// ACTUALIZA INFORMACION DE UNA ORDEN RESERVADO
router.put(
  "/update-factura/finalizar-reserva/:id",
  openingHours,
  async (req, res) => {
    const session = await db.startSession();
    session.startTransaction(); // Comienza una transacción

    try {
      const facturaId = req.params.id;
      const { infoOrden, infoPago } = req.body;

      const {
        codRecibo,
        dateRecepcion,
        Modalidad,
        Nombre,
        idCliente,
        Items,
        celular,
        direccion,
        datePrevista,
        descuento,
        dni,
        subTotal,
        totalNeto,
        cargosExtras,
        gift_promo,
        attendedBy,
      } = infoOrden;

      let infoCliente;
      let newPago;

      const fechaActual = moment().format("YYYY-MM-DD");
      const horaActual = moment().format("HH:mm");

      // 1. ADD O UPDATE CLIENTE
      if (idCliente) {
        // SI USO PUNTOS ACTUALIZAR RESTANDO SCORE
        if (
          descuento.modoDescuento === "Puntos" &&
          descuento.info?.puntosUsados > 0 &&
          descuento.estado
        ) {
          const clienteActualizado = await clientes
            .findByIdAndUpdate(
              idCliente,
              {
                $push: {
                  infoScore: {
                    idOrdenService: facturaId,
                    codigo: codRecibo,
                    dateService: {
                      fecha: dateRecepcion.fecha,
                      hora: dateRecepcion.hora,
                    },
                    score: -descuento.info?.puntosUsados, // los puntos en negativo
                  },
                },
                $inc: {
                  scoreTotal: -descuento.info?.puntosUsados, // restar los puntos del total
                },
              },
              { new: true, session }
            )
            .lean();

          // Si el cliente no se encuentra, no se hace nada
          if (!clienteActualizado) {
            console.log("Cliente no encontrado.");
          } else {
            infoCliente = {
              tipoAction: "update",
              data: clienteActualizado,
            };
          }
        }
      } else {
        // CREAR NEUVO CLIENTE
        const nuevoCliente = new clientes({
          dni,
          nombre: Nombre,
          direccion,
          phone: celular,
          infoScore: [],
          scoreTotal: 0,
        });
        await nuevoCliente.save({ session });

        infoCliente = {
          tipoAction: "add",
          data: nuevoCliente.toObject(),
        };
      }

      // 2. ADD CUPON
      if (gift_promo.length > 0) {
        for (const gift of gift_promo) {
          const { codigoPromocion, codigoCupon } = gift;

          const nuevoCupon = new Cupones({
            codigoPromocion,
            codigoCupon,
            estado: true,
            dateCreation: {
              fecha: fechaActual,
              hora: horaActual,
            },
            dateUse: {
              fecha: "",
              hora: "",
            },
          });

          await nuevoCupon.save({ session });
        }
      }

      // 3. UPDATE CUPON: (SI USO)
      if (
        descuento.modoDescuento === "Promocion" &&
        descuento.info &&
        descuento.estado
      ) {
        if (descuento.info.modo === "CODIGO") {
          const cupon = await Cupones.findOne({
            codigoCupon: descuento.info?.codigoCupon,
          }).session(session);

          if (cupon) {
            cupon.estado = false;
            cupon.dateUse.fecha = fechaActual;
            cupon.dateUse.hora = horaActual;
            await cupon.save({ session });
          }
        }
      }

      // 4. ADD PAGO

      let nuevoPago;
      if (infoPago) {
        nuevoPago = await handleAddPago(
          {
            ...infoPago,
            idOrden: facturaId,
          },
          session
        );
      }

      if (nuevoPago) {
        newPago = {
          ...nuevoPago,
          codRecibo: codRecibo,
          Nombre: Nombre,
          Modalidad: Modalidad,
        };
      }

      // 5. UPDATE FACTURA (ORDEN DE SERVICIO)
      const infoToUpdate = {
        dateRecepcion,
        Nombre,
        idCliente: infoCliente ? infoCliente.data._id : "",
        Items,
        celular,
        direccion,
        datePrevista,
        descuento,
        estado: "registrado",
        listPago: newPago ? [newPago._id] : [],
        dni,
        subTotal,
        totalNeto,
        cargosExtras,
        gift_promo,
        attendedBy,
      };

      const orderUpdated = await Factura.findByIdAndUpdate(
        facturaId,
        { $set: infoToUpdate },
        { new: true, session }
      ).lean();

      await session.commitTransaction();

      res.json({
        orderUpdated: {
          ...orderUpdated,
          ListPago: newPago ? [newPago] : [],
        },
        ...(newPago && { newPago }),
        ...(infoCliente && { changeCliente: infoCliente }),
      });
    } catch (error) {
      console.error("Error al actualizar los datos de la orden:", error);
      await session.abortTransaction();
      res
        .status(500)
        .json({ mensaje: "Error al actualizar los datos de la orden" });
    } finally {
      session.endSession();
    }
  }
);

// ACTUALIZA INFORMACION DE ITEMS EN LA ORDEN
router.put("/update-factura/detalle/:id", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const facturaId = req.params.id;
    const { Items, lastEdit } = req.body.infoOrden;

    // Actualizar los Items utilizando findByIdAndUpdate
    const infoUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      { $set: { Items, lastEdit } },
      { new: true, session, fields: { Items: 1 } } // Solo devuelve el campo Items
    ).lean();

    await session.commitTransaction();

    res.json(infoUpdated);
  } catch (error) {
    await session.abortTransaction();
    console.error("Error al actualizar los datos de la orden:", error);
    res
      .status(500)
      .json({ mensaje: "Error al actualizar los datos de la orden" });
  } finally {
    session.endSession();
  }
});

// ACTUALIZA ORDEN A ENTREGADO
router.put("/update-factura/entregar/:id", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const facturaId = req.params.id;
    const { location } = req.body;

    const fechaActual = moment().format("YYYY-MM-DD");
    const horaActual = moment().format("HH:mm");

    let infoCliente;
    let newGasto;

    if (req.body.hasOwnProperty("infoGastoByDelivery")) {
      const { infoGastoByDelivery } = req.body;
      if (Object.keys(infoGastoByDelivery).length) {
        newGasto = await handleAddGasto(infoGastoByDelivery);
      }
    }

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        $set: {
          estadoPrenda: "entregado",
          location: 1,
          dateEntrega: {
            fecha: fechaActual,
            hora: horaActual,
          },
        },
      },
      {
        new: true,
        session,
        fields: {
          idCliente: 1,
          codRecibo: 1,
          dateEntrega: 1,
          totalNeto: 1,
          estadoPrenda: 1,
          location: 1,
          dateRecepcion: 1,
        },
      } // Solo devuelve los campos necesarios
    ).lean();

    if (orderUpdated.idCliente) {
      try {
        const clienteActualizado = await clientes
          .findByIdAndUpdate(
            orderUpdated.idCliente,
            {
              $push: {
                infoScore: {
                  idOrdenService: orderUpdated._id,
                  codigo: orderUpdated.codRecibo,
                  dateService: orderUpdated.dateRecepcion,
                  score: parseInt(orderUpdated.totalNeto),
                },
              },
              $inc: {
                scoreTotal: parseInt(orderUpdated.totalNeto),
              },
            },
            { new: true, session: session }
          )
          .lean();

        if (clienteActualizado) {
          infoCliente = {
            tipoAction: "update",
            data: clienteActualizado,
          };
        } else {
          console.log("Cliente no encontrado.");
        }
      } catch (error) {
        console.error("Error al buscar o actualizar el cliente:", error);
        res.status(500).json({
          mensaje: "Error al buscar o actualizar el cliente",
        });
      }
    }

    if (location === 2) {
      await Almacen.findOneAndDelete({ idOrden: facturaId }).session(session);
    }

    await session.commitTransaction();

    res.json({
      orderUpdated: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
        location: orderUpdated.location,
        dateEntrega: orderUpdated.dateEntrega,
      },
      ...(newGasto && { newGasto }),
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Error al Entregar Orden de Servicio:", error);
    res.status(500).json({ mensaje: "Error al Entregar Orden de Servicio" });
  } finally {
    session.endSession();
  }
});

// ACTUALIZA ORDEN A CANCELAR ENTREGA
router.post("/update-factura/cancelar-entregar/:id", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction(); // Comienza una transacción

  try {
    const facturaId = req.params.id;

    let infoCliente;

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        estadoPrenda: "pendiente",
        dateEntrega: {
          fecha: "",
          hora: "",
        },
      },
      {
        new: true,
        session: session,
        fields: {
          idCliente: 1,
          estadoPrenda: 1,
          dateEntrega: 1,
          totalNeto: 1,
        },
      }
    );

    if (orderUpdated.idCliente) {
      try {
        const cliente = await clientes.findOne({ _id: orderUpdated.idCliente });

        if (cliente) {
          // Filtrar los elementos con el mismo idOrdenService y score positivo
          const elementosConMismoId = cliente.infoScore.filter(
            (info) =>
              info.idOrdenService === facturaId && parseInt(info.score) > 0
          );

          if (elementosConMismoId.length > 0) {
            const idsAEliminar = elementosConMismoId.map((info) => info._id);

            // Filtrar los elementos que no están en idsAEliminar
            cliente.infoScore = cliente.infoScore.filter(
              (info) => !idsAEliminar.includes(info._id)
            );

            // Recalcular scoreTotal
            cliente.scoreTotal = cliente.infoScore.reduce(
              (total, info) => total + parseInt(info.score),
              0
            );

            // Guardar los cambios en la base de datos
            const cliUpdate = await cliente.save({ new: true, session });

            // Preparar respuesta
            infoCliente = {
              tipoAction: "update",
              data: cliUpdate,
            };
          }
        } else {
          console.log("Cliente no encontrado.");
        }
      } catch (error) {
        console.error("Error al buscar o actualizar el cliente:", error);
        res.status(500).json({
          mensaje: "Error al buscar o actualizar el cliente",
        });
      }
    }

    await session.commitTransaction();

    res.json({
      orderUpdated: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
        dateEntrega: orderUpdated.dateEntrega,
      },
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ mensaje: "Error al cancelar Entrega" });
  } finally {
    session.endSession();
  }
});

// ACTUALIZA ORDEN ANULADO
router.put("/update-factura/anular/:id", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction(); // Comienza una transacción

  try {
    const { id: facturaId } = req.params;
    const { infoAnulacion } = req.body;

    const nuevaAnulacion = new Anular(infoAnulacion);
    await nuevaAnulacion.save({ session });

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        estadoPrenda: "anulado",
      },
      {
        new: true,
        session: session,
        fields: {
          estadoPrenda: 1,
          idCliente: 1,
          descuento: 1,
        },
      }
    );

    let infoCliente;
    // Eliminamos los Puntos usados
    if (
      orderUpdated.descuento.modoDescuento === "Puntos" &&
      orderUpdated.descuento.info?.puntosUsados > 0 &&
      orderUpdated.descuento.estado
    ) {
      const clienteActualizado = await clientes
        .findByIdAndUpdate(
          orderUpdated.idCliente,
          {
            $pull: {
              infoScore: { idOrdenService: facturaId },
            },
            $inc: {
              scoreTotal: parseInt(orderUpdated.descuento.info?.puntosUsados),
            },
          },
          { new: true, session }
        )
        .lean();
      if (clienteActualizado) {
        infoCliente = {
          tipoAction: "update",
          data: clienteActualizado,
        };
      } else {
        console.log("Cliente no encontrado.");
      }
    }

    if (
      orderUpdated.descuento.modoDescuento === "Promocion" &&
      orderUpdated.descuento.info &&
      orderUpdated.descuento.estado
    ) {
      if (orderUpdated.descuento.info.modo === "CODIGO") {
        const cupon = await Cupones.findOne({
          codigoCupon: orderUpdated.descuento.info?.codigoCupon,
        }).session(session);

        if (cupon) {
          cupon.estado = true;
          cupon.dateUse.fecha = "";
          cupon.dateUse.hora = "";
          await cupon.save({ session });
        }
      }
    }

    await session.commitTransaction();

    res.json({
      orderAnulado: {
        _id: orderUpdated._id,
        estadoPrenda: orderUpdated.estadoPrenda,
      },
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error(error);
    res.status(500).json({ mensaje: "Error al ANULAR Orden de Servicio" });
  } finally {
    session.endSession();
  }
});

// ACTUALIZA ORDEN (NOTA)
router.put("/update-factura/nota/:id", async (req, res) => {
  try {
    const { id: facturaId } = req.params;
    const { infoNotas } = req.body;

    const orderUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      { notas: infoNotas },
      { new: true, fields: { notas: 1 } }
    );

    if (!orderUpdated) {
      return res.status(404).json({ mensaje: "Factura no encontrada" });
    }

    res.json({
      _id: orderUpdated._id,
      notas: orderUpdated.notas,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ mensaje: "Error al actualizar la nota de la factura" });
  }
});

// ANULAR Y REMPLAZAR ORDEN SERVICIO
router.post("/anular-to-replace", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  const { dataToNewOrden, dataToAnular } = req.body;

  try {
    const { idOrden, infoAnulacion } = dataToAnular;

    const nuevaAnulacion = new Anular(infoAnulacion);
    await nuevaAnulacion.save({ session });

    const orderAnulada = await Factura.findByIdAndUpdate(
      idOrden,
      {
        estadoPrenda: "anulado",
      },
      {
        new: true,
        session: session,
        fields: {
          estadoPrenda: 1,
          idCliente: 1,
          descuento: 1,
        },
      }
    );

    let listChangeCliente = [];

    if (
      orderAnulada.descuento.modoDescuento === "Puntos" &&
      orderAnulada.descuento.info?.puntosUsados > 0 &&
      orderAnulada.descuento.estado
    ) {
      const clienteActualizado = await clientes.findByIdAndUpdate(
        orderAnulada.idCliente,
        {
          $pull: {
            infoScore: { idOrdenService: idOrden },
          },
          $inc: {
            scoreTotal: parseInt(orderAnulada.descuento.info?.puntosUsados),
          },
        },
        { new: true, session }
      );
      // Si el cliente no se encuentra, no se hace nada
      if (!clienteActualizado) {
        console.log("Cliente no encontrado.");
      } else {
        listChangeCliente.push({
          tipoAction: "update",
          data: clienteActualizado,
        });
      }
    }
    if (
      orderAnulada.descuento.modoDescuento === "Promocion" &&
      orderAnulada.descuento.info !== null &&
      orderAnulada.descuento.estado
    ) {
      if (orderAnulada.descuento.info.modo === "CODIGO") {
        const cupon = await Cupones.findOne({
          codigoCupon: orderAnulada.descuento.info?.codigoCupon,
        }).session(session);

        if (cupon) {
          cupon.estado = true;
          cupon.dateUse.fecha = "";
          cupon.dateUse.hora = "";
          await cupon.save({ session });
        }
      }
    }

    const result = await handleAddFactura(dataToNewOrden, session);

    const { newOrder, newPago, newGasto, infoCliente, newCodigo } = result;

    await session.commitTransaction();

    if (infoCliente) {
      listChangeCliente.push(infoCliente);
    }

    res.json({
      orderAnulado: {
        _id: orderAnulada._id,
        estadoPrenda: orderAnulada.estadoPrenda,
      },
      newOrder,
      ...(newPago && { listNewsPagos: newPago }),
      ...(newGasto && { newGasto }),
      ...(listChangeCliente.length > 0 && { listChangeCliente }),
      ...(newCodigo && { newCodigo: newCodigo.codActual }),
    });
  } catch (error) {
    console.error("Error al guardar los datos:", error);
    await session.abortTransaction();

    res.status(500).json({ mensaje: "Error al guardar los datos" });
  } finally {
    session.endSession();
  }
});

// ACTUALIZA TODA LA INFORMACION DE LA FACTURA
router.put("/update-factura/completa/:id", async (req, res) => {
  const session = await db.startSession();
  session.startTransaction();

  try {
    const facturaId = req.params.id;
    const { infoOrden } = req.body;
    const {
      dateRecepcion,
      Modalidad,
      Nombre,
      idCliente,
      Items,
      celular,
      direccion,
      datePrevista,
      dateRecojo,
      dateEntrega,
      descuento,
      dni,
      subTotal,
      totalNeto,
      cargosExtras,
      lastEdit,
    } = infoOrden;

    let infoCliente;

    // Buscar la factura registrada
    const orderRegistered = await Factura.findById(facturaId)
      .session(session)
      .select({
        codRecibo: 1,
        idCliente: 1,
        descuento: 1,
      });

    if (!orderRegistered) {
      throw new Error("Factura no encontrada.");
    }

    // Eliminamos los Puntos usados
    if (
      orderRegistered.idCliente &&
      orderRegistered.descuento.modoDescuento === "Puntos" &&
      orderRegistered.descuento.info?.puntosUsados > 0 &&
      orderRegistered.descuento.estado
    ) {
      await clientes.findByIdAndUpdate(
        orderRegistered.idCliente,
        {
          $pull: { infoScore: { idOrdenService: facturaId } },
          $inc: {
            scoreTotal: parseInt(orderRegistered.descuento.info?.puntosUsados),
          },
        },
        { new: true, session }
      );
    }

    // Revalidar Cupon usado
    if (
      orderRegistered.descuento.modoDescuento === "Promocion" &&
      orderRegistered.descuento.info &&
      orderRegistered.descuento.estado
    ) {
      if (orderRegistered.descuento.info.modo === "CODIGO") {
        const cupon = await Cupones.findOne({
          codigoCupon: orderRegistered.descuento.info?.codigoCupon,
        }).session(session);

        if (cupon) {
          cupon.estado = true;
          cupon.dateUse.fecha = "";
          cupon.dateUse.hora = "";
          await cupon.save({ session });
        }
      }
    }

    // UPDATE CLIENTE (solo si idCliente no es vacío y diferente del actual)
    if (idCliente && orderRegistered.idCliente !== idCliente) {
      await clientes.findByIdAndUpdate(
        idCliente,
        {
          $set: {
            nombre: Nombre,
            direccion,
            phone: celular,
          },
        },
        { new: true, session }
      );
    }

    // Actualizar la factura utilizando findByIdAndUpdate
    const infoUpdated = await Factura.findByIdAndUpdate(
      facturaId,
      {
        $set: {
          dateRecepcion,
          Modalidad,
          Nombre,
          idCliente,
          Items,
          celular,
          direccion,
          datePrevista,
          dateRecojo,
          dateEntrega,
          descuento,
          dni,
          subTotal,
          totalNeto,
          cargosExtras,
          lastEdit,
        },
      },
      { new: true }
    ).session(session);

    // 2. UPDATE CUPON: (SI USO)
    if (
      descuento.estado &&
      descuento.modoDescuento === "Promocion" &&
      descuento.info
    ) {
      if (descuento.info.modo === "CODIGO") {
        const cupon = await Cupones.findOne({
          codigoCupon: descuento.info.codigoCupon,
        }).session(session);

        const fechaActual = moment().format("YYYY-MM-DD");
        const horaActual = moment().format("HH:mm");

        if (cupon) {
          cupon.estado = false;
          cupon.dateUse.fecha = fechaActual;
          cupon.dateUse.hora = horaActual;
          await cupon.save({ session });
        }
      }
    }

    // UPDATE CLIENTE (si se usan puntos)
    if (
      idCliente &&
      descuento.estado &&
      descuento.info &&
      descuento.modoDescuento === "Puntos"
    ) {
      try {
        // Buscar y actualizar el cliente si existe
        const clienteActualizado = await clientes.findByIdAndUpdate(
          idCliente,
          {
            $push: {
              infoScore: {
                idOrdenService: facturaId,
                codigo: orderRegistered.codRecibo,
                dateService: {
                  fecha: dateRecepcion.fecha,
                  hora: dateRecepcion.hora,
                },
                score: -descuento.info.puntosUsados, // los puntos en negativo
              },
            },
            $inc: {
              scoreTotal: -descuento.info.puntosUsados, // restar los puntos del total
            },
          },
          { new: true, session }
        );

        // Si el cliente no se encuentra, no se hace nada
        if (!clienteActualizado) {
          console.log("Cliente no encontrado.");
        } else {
          infoCliente = {
            tipoAction: "update",
            data: clienteActualizado,
          };
        }
      } catch (error) {
        console.error("Error al buscar o actualizar el cliente:", error);
        throw new Error("Error al buscar o actualizar el cliente");
      }
    }

    await session.commitTransaction();

    res.json({
      infoUpdated,
      ...(infoCliente && { changeCliente: infoCliente }),
    });
  } catch (error) {
    console.error("Error al actualizar la factura completa:", error);
    await session.abortTransaction();
    res.status(500).json({
      mensaje: "Error al actualizar la factura completa",
    });
  } finally {
    session.endSession();
  }
});

export default router;
