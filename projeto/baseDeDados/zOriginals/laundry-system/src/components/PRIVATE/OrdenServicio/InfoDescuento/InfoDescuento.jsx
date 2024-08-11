/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import React from "react";
import "./infoDescuento.scss";
import SwtichDimension from "../../../SwitchDimension/SwitchDimension";
import { Button, Group } from "@mantine/core";

import { Radio } from "@mantine/core";

const InfoDescuento = ({
  paso,
  descripcion,
  changeValue,
  values,
  iCliente,
}) => {
  const defaultDescuento = {
    estado: true,
    modoDescuento: "Ninguno",
    info: null,
    monto: 0,
  };
  const handleChangeDescuento = (tipoDescuento) => {
    // LIMPIAR DESCUENTO MANUAL
    values.Items.forEach((row, index) => {
      changeValue(`Items.${index}.descuentoManual`, 0);
      changeValue(`Items.${index}.total`, row.monto);
    });

    if (tipoDescuento === "Manual") {
      console.log("Manual");
    } else if (tipoDescuento === "Puntos") {
      console.log("Puntos");
      if (iCliente) {
        changeValue(`descuento.info`, {
          puntosUsados: 0,
          puntosRestantes: 0,
        });
      }
    } else if (tipoDescuento === "Promocion") {
      console.log("Promocion");
      changeValue(`descuento.info`, null);
    } else {
      changeValue(`descuento.info`, null);
    }

    changeValue("descuento.modoDescuento", tipoDescuento);
  };

  const handleGetOpcionDescuento = (estado) => {
    if (estado === "SI") {
      changeValue("descuento", defaultDescuento);
    } else {
      changeValue("descuento", defaultDescuento);
    }
  };

  const handleCancelarDescuento = () => {
    changeValue("descuento", {
      ...defaultDescuento,
      estado: false,
    });
  };

  return (
    <div className="info-descuento">
      <div className="title">
        <h1>PASO {paso}</h1>
        <h2>{descripcion}</h2>
      </div>
      <div className="body">
        {values.descuento.estado ? (
          <>
            <Button
              className="cancel-descuento"
              onClick={handleCancelarDescuento}
            >
              X
            </Button>
            <Radio.Group
              label="Tipo de Descuento :"
              className="group-descuento"
              name="favoriteFramework"
              value={values.descuento.modoDescuento}
              onChange={(value) => {
                handleChangeDescuento(value);
              }}
            >
              <Group mt="md">
                <Radio value="Promocion" label="Promocion" />
                <Radio
                  disabled={iCliente === null}
                  value="Puntos"
                  label="Puntos"
                />

                <Radio value="Manual" label="Manual" />
              </Group>
            </Radio.Group>
          </>
        ) : null}
        {values.descuento.estado === false ? (
          <div className="input-switch">
            <SwtichDimension
              onSwitch="SI"
              offSwitch="NO"
              name="sw-stado-descuento"
              defaultValue={values.descuento.estado}
              handleChange={handleGetOpcionDescuento}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default InfoDescuento;
