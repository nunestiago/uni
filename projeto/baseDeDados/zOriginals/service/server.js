import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketServer } from "socket.io";
import { PORT } from "./server/config/config.js";

import { connectDB } from "./server/config/db.js";
import facturaRoutes from "./server/routes/Factura.js";
import codFacturaRoutes from "./server/routes/codigoFactura.js";
import anularRoutes from "./server/routes/anular.js";
import gastoRoutes from "./server/routes/gastos.js";
import cuadreDiarioRoutes from "./server/routes/cuadreDiario.js";
import clientesRoutes from "./server/routes/clientes.js";
import puntosRoutes from "./server/routes/puntos.js";
import impuestoRoutes from "./server/routes/impuesto.js";
import usuariosRoutes from "./server/routes/usuarios.js";
import reportesRoutes from "./server/routes/reportes.js";
import promocionesRoutes from "./server/routes/promociones.js";
import cuponesRoutes from "./server/routes/cupones.js";
import almacenRoutes from "./server/routes/almacen.js";
import metasRoutes from "./server/routes/metas.js";
import donacionRoutes from "./server/routes/docacion.js";
import negocioRoutes from "./server/routes/negocio.js";
import categoriasRoutes from "./server/routes/categorias.js";
import productosRoutes from "./server/routes/portafolio/productos.js";
import serviciosRoutes from "./server/routes/portafolio/servicios.js";
import portafolioRoutes from "./server/routes/portafolio/portafolio.js";
import pagosRoutes from "./server/routes/pagos.js";
import tipoGastosRoutes from "./server/routes/tipoGasto.js";
import asistenciaRoutes from "./server/routes/personal/asistencia.js";
import personalRoutes from "./server/routes/personal/personal.js";

import { timeZone } from "./server/utils/varsGlobal.js";
import moment from "moment";
import "moment/locale/es.js";
import "moment-timezone";
import "moment-timezone/builds/moment-timezone-with-data.js";

connectDB();

const app = express();

moment.tz.setDefault(timeZone);

const server = http.createServer(app);

export const io = new SocketServer(server, {
  cors: {
    origin: "*",
  },
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  console.log(`Un cliente se ha conectado : ${socket.id}`);

  // Maneja eventos cuando el cliente envía un mensaje
  socket.on("client:changeOrder", (info) => {
    socket.broadcast.emit("server:changeOrder", info);
  });

  socket.on("client:updateCodigo", (info) => {
    io.emit("server:updateCodigo", info);
  });

  // UPDATE INFO EN ORDEN DE SERVICIO
  socket.on("client:updateOrder", (info) => {
    const { orderUpdated } = info;
    socket.broadcast.emit("server:orderUpdated", orderUpdated);
  });

  socket.on("client:updateOrder(ITEMS)", (info) => {
    socket.broadcast.emit("server:updateOrder(ITEMS)", info);
  });

  socket.on("client:updateOrder(FINISH_RESERVA)", (info) => {
    socket.broadcast.emit("server:updateOrder(FINISH_RESERVA)", info);
  });

  socket.on("client:updateOrder(ENTREGAR)", (info) => {
    socket.broadcast.emit("server:updateOrder(ENTREGAR)", info);
  });

  socket.on("client:updateOrder(CANCELAR_ENTREGA)", (info) => {
    socket.broadcast.emit("server:updateOrder(CANCELAR_ENTREGA)", info);
  });

  socket.on("client:updateOrder(ANULACION)", (info) => {
    socket.broadcast.emit("server:updateOrder(ANULACION)", info);
  });

  socket.on("client:updateOrder(NOTA)", (info) => {
    socket.broadcast.emit("server:updateOrder(NOTA)", info);
  });
  // ACCIONES EN REPORTE DE ORDEN (PENDIENTES Y ALMACENADOS):
  socket.on("client:updateOrder(LOCATION)", (info) => {
    socket.broadcast.emit("server:updateOrder(LOCATION)", info);
  });
  // REMOVER CUANDO SE ESTA ANULANDO O ENTREGANDO - DE REPORTE DE PENDIENTES Y ALMACEN
  socket.on("client:onRemoveOrderReporteAE", (info) => {
    socket.broadcast.emit("server:onRemoveOrderReporteAE", info);
  });
  // REMOVER CUANDO SE ESTA ALMACENANDO - DE REPORTE DE PENDIENTES
  socket.on("client:onRemoveOrderReportP", (info) => {
    socket.broadcast.emit("server:onRemoveOrderReportP", info);
  });
  // REMOVER CUANDO SE ESTA DONANDO - DE REPORTE DE ALMACENADO
  socket.on("client:onRemoveOrderReporteD", (info) => {
    socket.broadcast.emit("server:onRemoveOrderReporteD", info);
  });
  socket.on("client:onAddOrderAlmacen", (info) => {
    socket.broadcast.emit("server:onAddOrderAlmacen", info);
  });
  // ---------------------------------------- //
  socket.on("client:updateListOrder", (info) => {
    socket.broadcast.emit("server:updateListOrder", info);
    socket.broadcast.emit("server:updateListOrder:child", info);
  });

  socket.on("client:cancel-delivery", (info) => {
    socket.broadcast.emit("server:cancel-delivery", info);
  });

  socket.on("client:changeCuadre", (info) => {
    io.emit("server:changeCuadre", info);
    socket.broadcast.emit("server:changeCuadre:child", info);
  });

  socket.on("client:onLogin", (info) => {
    socket.broadcast.emit("server:onLogin", info);
  });

  socket.on("client:onNewUser", (info) => {
    socket.broadcast.emit("server:onNewUser", info);
  });

  socket.on("client:onChangeUser", (info) => {
    socket.broadcast.emit("server:onChangeUser", info);
  });

  socket.on("client:onUpdateUser", (info) => {
    socket.broadcast.emit("server:onUpdateUser", info);
  });

  socket.on("client:onDeleteUser", (info) => {
    socket.broadcast.emit("server:onDeleteUser", info);
  });

  // PARA INFORMAR AL CLIENTE, QUE SU CUENTA HA SIDO ELIMINADA
  // Y  LO SAQUE DEL SISTEMA
  socket.on("client:onDeleteAccount", (info) => {
    socket.broadcast.emit("server:onDeleteAccount", info);
  });

  socket.on("client:cPromotions", (info) => {
    socket.broadcast.emit("server:cPromotions", info);
  });

  socket.on("client:cPuntos", (info) => {
    socket.broadcast.emit("server:cPuntos", info);
  });

  socket.on("client:cNegocio", (info) => {
    socket.broadcast.emit("server:cNegocio", info);
  });

  socket.on("client:cGasto", (info) => {
    // socket.broadcast.emit("server:cGasto", info);
    io.emit("server:cGasto", info);
  });

  socket.on("client:cImpuesto", (info) => {
    socket.broadcast.emit("server:cImpuesto", info);
  });

  socket.on("client:cPago", (info) => {
    socket.broadcast.emit("server:cPago", info);
  });

  socket.on("client:cClientes", (info) => {
    io.emit("server:cClientes", info);
  });

  socket.on("client:cService", (info) => {
    socket.broadcast.emit("server:cService", info);
  });

  socket.on("client:cCategoria", (info) => {
    socket.broadcast.emit("server:cCategoria", info);
  });

  // Maneja el evento cuando un cliente se desconecta
  socket.on("disconnect", () => {
    console.log(`Un cliente se ha desconectado : ${socket.id}`);
  });
});

// Rutas
// Factura
app.use("/api/lava-ya/", facturaRoutes);
// Codigo
app.use("/api/lava-ya/", codFacturaRoutes);
// Anular
app.use("/api/lava-ya/", anularRoutes);
// Gasto
app.use("/api/lava-ya/", gastoRoutes);
// Cuadre Diario
app.use("/api/lava-ya/", cuadreDiarioRoutes);
// Clientes
app.use("/api/lava-ya/", clientesRoutes);
// Puntos
app.use("/api/lava-ya/", puntosRoutes);
// Impuesto
app.use("/api/lava-ya/", impuestoRoutes);
// Usuarios
app.use("/api/lava-ya/", usuariosRoutes);
// Reportes
app.use("/api/lava-ya/", reportesRoutes);
// Promociones
app.use("/api/lava-ya/", promocionesRoutes);
// Cupones
app.use("/api/lava-ya/", cuponesRoutes);
// Almacen
app.use("/api/lava-ya/", almacenRoutes);
// Metas
app.use("/api/lava-ya/", metasRoutes);
// Donacion
app.use("/api/lava-ya/", donacionRoutes);
// Negocio
app.use("/api/lava-ya/", negocioRoutes);
// Categorias
app.use("/api/lava-ya/", categoriasRoutes);
// Productos
app.use("/api/lava-ya/", productosRoutes);
// Servicios
app.use("/api/lava-ya/", serviciosRoutes);
// Portafolio
app.use("/api/lava-ya/", portafolioRoutes);
// Pagos
app.use("/api/lava-ya/", pagosRoutes);
// TipoGastos
app.use("/api/lava-ya/", tipoGastosRoutes);
// Asistencia
app.use("/api/lava-ya/", asistenciaRoutes);
// Personal
app.use("/api/lava-ya/", personalRoutes);

server.listen(PORT, () => {
  console.log("Server Iniciado en puerto: " + PORT);
});

app.get("/", (req, res) => {
  // Aquí puedes definir el HTML que quieres enviar como respuesta
  const htmlResponse = `
    <html>
      <head>
        <title>Estado del Servidor</title>
      </head>
      <body>
        <h1>Estado del Servidor</h1>
        <p>El servidor está funcionando correctamente.</p>
      </body>
    </html>
  `;

  // Envía el HTML como respuesta
  res.send(htmlResponse);
});
