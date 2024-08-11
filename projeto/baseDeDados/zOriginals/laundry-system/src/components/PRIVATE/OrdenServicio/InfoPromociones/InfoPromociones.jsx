/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
/* eslint-disable no-unused-vars */
import React, { useEffect } from "react";
import "./infoPromociones.scss";
import { TextInput } from "@mantine/core";
import SwtichDimension from "../../../SwitchDimension/SwitchDimension";
import { useState } from "react";
import { useSelector } from "react-redux";
import CardPromo from "./CardPromo/CardPromo";

const InfoPromociones = ({
  values,
  changeValue,
  validCupon,
  recalculatePromoDescuento,
}) => {
  const infoPromocion = useSelector((state) => state.promocion.infoPromocion);
  const [listPromos, setListPromos] = useState([]);

  const [modoPromocion, setModoPromocion] = useState("SELECCION");
  const [codigoCupon, setCodigoCupon] = useState();
  const [iPromo, setIPromo] = useState(null);

  // const [PortalValidPromocion, setPortalValiPromocion] = useState(false);

  useEffect(() => {
    const iPromos = infoPromocion.filter(
      (promocion) => promocion.state === "activo"
    );
    setListPromos(iPromos);
  }, [infoPromocion]);

  useEffect(() => {
    if (
      values.descuento.modoDescuento === "Promocion" &&
      values.descuento.info
    ) {
      setModoPromocion(values.descuento.info.modo);
    }
  }, [values.descuento]);

  return (
    <div className="info-promocion">
      <div className="head-title">
        <h1>Promociones</h1>
      </div>
      <hr />
      <div className="body-promo">
        <SwtichDimension
          onSwitch="SELECCION"
          offSwitch="CODIGO"
          name="sw-stado-descuento"
          defaultValue={modoPromocion === "SELECCION" ? true : false}
          handleChange={(value) => {
            setModoPromocion(value);
            changeValue("descuento.info", null);
            changeValue("descuento.monto", 0);
            setIPromo(null);
          }}
        />
        {modoPromocion === "CODIGO" ? (
          values.descuento.info ? (
            <div className="list-promociones">
              <CardPromo
                info={values.descuento.info}
                clean={() => {
                  changeValue("descuento.info", null);
                  changeValue("descuento.monto", 0);
                  setIPromo(null);
                }}
                montoDescuento={values.descuento.monto}
                modoPromocion={modoPromocion}
              />
            </div>
          ) : (
            // <Button
            //   type="button"
            //   className="btn-promocion"
            //   onClick={() => {
            //     // setPortalValiPromocion(true);
            //     setIPromo(null);
            //     setCodigoCupon();
            //   }}
            // >
            //   Agregar Promocion
            // </Button>
            <div className="valid-promocion">
              <TextInput
                label="Codigo de Promocion :"
                className="input-promotion"
                radius="md"
                onChange={(e) => {
                  setCodigoCupon(e.target.value);
                  setIPromo(null);
                }}
                autoComplete="off"
              />
              <button
                type="button"
                className="btn-valid"
                onClick={async () => {
                  const infoValidacion = await validCupon(codigoCupon);
                  setIPromo(infoValidacion);
                }}
              >
                Validar
              </button>
              {iPromo ? (
                <>
                  <textarea
                    style={
                      iPromo?.validacion === true
                        ? { borderColor: "#00e676" }
                        : { borderColor: "#f5532f" }
                    }
                    className="description-info"
                    value={
                      iPromo?.validacion === true
                        ? iPromo?.promocion.descripcion
                        : iPromo?.respuesta
                    }
                    readOnly
                  />
                  {iPromo?.validacion === true ? (
                    <button
                      type="button"
                      className="btn-add"
                      onClick={() => {
                        // Buscar si ya existe un registro en la lista
                        if (!values.descuento.info && iPromo) {
                          const infoDescuentoByPromo = {
                            cantidadMin: iPromo.promocion.cantidadMin,
                            codigoCupon: codigoCupon,
                            codigoPromocion: iPromo.promocion.codigo,
                            descripcion: iPromo.promocion.descripcion,
                            prenda: iPromo.promocion.prenda,
                            alcance: iPromo.promocion.alcance,
                            nMultiplicador:
                              iPromo.promocion.tipoDescuento === "Porcentaje"
                                ? iPromo.promocion.descuento / 100
                                : iPromo.promocion.descuento,
                            tipoDescuento: iPromo.promocion.tipoDescuento,
                            tipoPromocion: iPromo.promocion.tipoPromocion,
                            modo: modoPromocion,
                          };

                          const descuento =
                            recalculatePromoDescuento(infoDescuentoByPromo);

                          changeValue("descuento.info", infoDescuentoByPromo);
                          changeValue("descuento.monto", descuento);

                          alert("¡Se agregó correctamente!");
                          // setPortalValiPromocion(false);
                          setIPromo(null);
                          setCodigoCupon();
                        } else {
                          // Si ya existe un registro con el mismo codigoPromocion, puedes manejarlo como desees
                          alert("¡El registro ya existe!");
                        }
                      }}
                    >
                      Agregar
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          )
        ) : listPromos.length > 0 ? (
          values.descuento.info ? (
            <CardPromo
              info={values.descuento.info}
              clean={() => {
                changeValue("descuento.info", null);
                changeValue("descuento.monto", 0);
                setIPromo(null);
              }}
              montoDescuento={values.descuento.monto}
              modoPromocion={modoPromocion}
            />
          ) : (
            <div className="list-buttons-promos">
              {listPromos.map((p, index) => (
                <div
                  className="optin-promo"
                  key={index}
                  onClick={() => document.getElementById(p._id).click()}
                >
                  <input
                    type="radio"
                    id={p._id}
                    name="radioGroup"
                    value={p.descripcion}
                    checked={values.descuento?.info?._id === p._id}
                    onChange={() => {
                      const infoDescuentoByPromo = {
                        _id: p._id,
                        cantidadMin: p.cantidadMin,
                        codigoPromocion: p.codigo,
                        descripcion: p.descripcion,
                        prenda: p.prenda,
                        alcance: p.alcance,
                        nMultiplicador:
                          p.tipoDescuento === "Porcentaje"
                            ? p.descuento / 100
                            : p.descuento,
                        tipoDescuento: p.tipoDescuento,
                        tipoPromocion: p.tipoPromocion,
                        modo: modoPromocion,
                      };

                      const descuento =
                        recalculatePromoDescuento(infoDescuentoByPromo);

                      changeValue("descuento.info", infoDescuentoByPromo);
                      changeValue("descuento.monto", descuento);
                    }}
                  />
                  <label htmlFor={p._id}>{p.descripcion}</label>
                </div>
              ))}
            </div>
          )
        ) : (
          <span>No hay promociones disponible</span>
        )}
      </div>
      {/* {PortalValidPromocion ? (
        <Portal
          onClose={() => {
            setPortalValiPromocion(false);
          }}
        >
          <div className="valid-promocion">
            <h2>Ingresar codigo de Promocion</h2>
            <TextInput
              label="Codigo de Promocion :"
              className="input-promotion"
              radius="md"
              onChange={(e) => {
                setCodigoCupon(e.target.value);
                setIPromo(null);
              }}
              autoComplete="off"
            />
            <button
              type="button"
              className="btn-valid"
              onClick={async () => {
                const infoValidacion = await validCupon(codigoCupon);
                setIPromo(infoValidacion);
              }}
            >
              Validar
            </button>
            {iPromo ? (
              <>
                <textarea
                  style={
                    iPromo?.validacion === true
                      ? { borderColor: "#00e676" }
                      : { borderColor: "#f5532f" }
                  }
                  className="description-info"
                  value={
                    iPromo?.validacion === true
                      ? iPromo?.promocion.descripcion
                      : iPromo?.respuesta
                  }
                  readOnly
                />
                {iPromo?.validacion === true ? (
                  <button
                    type="button"
                    className="btn-add"
                    onClick={() => {
                      // Buscar si ya existe un registro en la lista
                      const exists =
                        values.descuento.info?.codigoCupon === codigoCupon;

                      if (!exists && iPromo) {
                        const infoDescuentoByPromo = {
                          cantidadMin: iPromo.promocion.cantidadMin,
                          codigoCupon: codigoCupon,
                          codigoPromocion: iPromo.promocion.codigo,
                          descripcion: iPromo.promocion.descripcion,
                          prenda: iPromo.promocion.prenda,
                          alcance: iPromo.promocion.alcance,
                          nMultiplicador:
                            iPromo.promocion.tipoDescuento === "Porcentaje"
                              ? iPromo.promocion.descuento / 100
                              : iPromo.promocion.descuento,
                          tipoDescuento: iPromo.promocion.tipoDescuento,
                          tipoPromocion: iPromo.promocion.tipoPromocion,
                          modo: modoPromocion,
                        };

                        const descuento =
                          recalculatePromoDescuento(infoDescuentoByPromo);

                        changeValue("descuento.info", infoDescuentoByPromo);
                        changeValue("descuento.monto", descuento);

                        alert("¡Se agregó correctamente!");
                        setPortalValiPromocion(false);
                        setIPromo(null);
                        setCodigoCupon();
                      } else {
                        // Si ya existe un registro con el mismo codigoPromocion, puedes manejarlo como desees
                        alert("¡El registro ya existe!");
                      }
                    }}
                  >
                    Agregar
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </Portal>
      ) : null} */}
    </div>
  );
};

export default InfoPromociones;
