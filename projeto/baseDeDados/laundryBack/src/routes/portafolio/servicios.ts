import express from "express";
import Servicio from "../../models/portafolio/servicios.js";
import Categoria from "../../models/categorias.js";
import Promocion from "../../models/promociones.js";
import moment from "moment"; // Importa moment para trabajar con fechas

const router = express.Router();

router.post("/add-servicio", (req, res) => {
  const { nombre, idCategoria, precioVenta, simboloMedida, estado } = req.body;

  // Agrega la fecha de creación actual
  const dateCreation = moment().format("YYYY-MM-DD");

  const newProducto = new Servicio({
    nombre,
    idCategoria,
    precioVenta,
    dateCreation,
    simboloMedida,
    estado,
  });

  newProducto
    .save()
    .then((servicioGuardado) => {
      res.json({
        tipoAction: "added",
        data: servicioGuardado,
      });
    })
    .catch((error) => {
      console.error("Error al Crear servicio:", error);
      res.status(500).json({ mensaje: "Error al Crear servicio" });
    });
});

router.get("/get-servicios", async (req, res) => {
  try {
    // Obtener todos los servicios
    const servicios = await Servicio.find();

    // Almacenar servicios con información de categoría
    let servicioDelivery = null;

    // Recorrer cada servicio para obtener información de categoría
    for (const servicio of servicios) {
      // Buscar la categoría correspondiente
      const categoria = await Categoria.findById(servicio.idCategoria);

      // Verificar si la categoría cumple con las condiciones dadas
      if (
        categoria &&
        categoria.name === "Unico" &&
        categoria.nivel === "primario" &&
        servicio.nombre === "Delivery"
      ) {
        // Agregar información del servicio y la categoría al array resultante
        servicioDelivery = servicio;

        break;
      }
    }

    // Enviar los datos
    res.json({ servicios, servicioDelivery });
  } catch (error) {
    console.error("Error al obtener servicios:", error);
    res.status(500).json({ mensaje: "Error al obtener servicios" });
  }
});

router.put("/update-servicio/:idServicio", async (req, res) => {
  const { idServicio } = req.params;
  const { nombre, idCategoria, precioVenta, simboloMedida, estado } = req.body;

  try {
    const updatedServicio = await Servicio.findOneAndUpdate(
      { _id: idServicio },
      { $set: { nombre, idCategoria, precioVenta, simboloMedida, estado } },
      { new: true }
    );

    if (updatedServicio) {
      return res.json({
        tipoAction: "updated",
        data: updatedServicio,
      });
    } else {
      return res.status(404).json({ mensaje: "No se encontró el servicio" });
    }
  } catch (error) {
    console.error("Error al actualizar servicio:", error);
    res.status(500).json({ mensaje: "Error al actualizar servicio" });
  }
});

router.delete("/delete-servicio/:idServicio", async (req, res) => {
  const { idServicio } = req.params;

  try {
    // Verificar si el servicio está siendo usado en Promociones con alcance distinto de "Todos"
    const promocionesConServicio = await Promocion.find(
      { prenda: idServicio, alcance: { $ne: "Todos" } },
      { _id: 1, codigo: 1 }
    );

    if (promocionesConServicio.length > 0) {
      const codigos = promocionesConServicio.map(
        (promocion) => promocion.codigo
      );
      return res.status(400).json({
        mensaje:
          "No se puede eliminar el servicio porque está siendo utilizado en una o mas promociones.",
        codigos,
      });
    }

    // Si el servicio no está siendo usado en promociones, procede a eliminarlo
    const servicioEliminado = await Servicio.findByIdAndRemove(idServicio);

    if (servicioEliminado) {
      return res.json({
        tipoAction: "deleted",
        data: {
          _id: servicioEliminado._id,
        },
      });
    } else {
      return res.status(404).json({ mensaje: "Servicio no encontrado" });
    }
  } catch (error) {
    console.error("Error al eliminar servicio:", error);
    res.status(500).json({ mensaje: "Error al eliminar servicio" });
  }
});

export default router;
