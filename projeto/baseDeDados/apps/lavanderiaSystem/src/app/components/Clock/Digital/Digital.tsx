import React, { useState } from 'react';
import { useEffect } from 'react';
import './digital.scss';

const Digital = ({ iTime }: { iTime: Date }) => {
  const [time, setTime] = useState(new Date());

  // Función para formatear los números de un solo dígito con un cero delante
  const formatNumber = (number: number) => {
    return number < 10 ? `0${number}` : number;
  };

  useEffect(() => {
    if (iTime) {
      setTime(iTime);
    } else {
      const timerId = setInterval(() => {
        setTime(new Date());
      }, 1000);

      return () => {
        clearInterval(timerId);
      };
    }
  }, [iTime]);

  return (
    <div className="content-digital-time">
      <div className="digital-time">
        <span>{formatNumber(time.getHours())}</span> :&nbsp;
        <span>{formatNumber(time.getMinutes())}</span> :&nbsp;
        <span>{formatNumber(time.getSeconds())}</span>&nbsp;&nbsp;
        <span>{time?.getHours() >= 12 ? 'PM' : 'AM'}</span>
      </div>
      <div className="date-time">
        <span>{new Date(time).toDateString()}</span>
      </div>
    </div>
  );
};

export default Digital;
