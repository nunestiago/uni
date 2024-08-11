/* eslint-disable react/prop-types */
import { TextInput } from "@mantine/core";
import "./cardPromo.scss";
import { formatThousandsSeparator } from "../../../../../utils/functions";

const CardPromo = ({ info, clean, montoDescuento, modoPromocion }) => {
  return (
    <div className="card-promo">
      <button
        className="delete-promo"
        type="button"
        onClick={() => {
          clean();
        }}
      >
        X
      </button>
      <span>Promocion :</span>
      <p>{info?.descripcion}</p>
      <div className="extra-info">
        {modoPromocion === "CODIGO" ? (
          <TextInput
            className="input-info"
            label="Codigo :"
            value={info?.codigoCupon}
            readOnly
          />
        ) : (
          <TextInput
            className="input-info"
            label="Promocion :"
            value={info?.codigoPromocion}
            readOnly
          />
        )}

        <TextInput
          className="input-info"
          label="Descuento :"
          value={formatThousandsSeparator(montoDescuento)}
          readOnly
        />
      </div>
    </div>
  );
};

export default CardPromo;
