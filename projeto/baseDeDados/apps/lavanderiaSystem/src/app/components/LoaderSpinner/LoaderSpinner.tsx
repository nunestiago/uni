import './loaderSpinner.scss';

export default function LoaderSpinner({ size }: { size: number }) {
  return (
    <div id="loading" style={{ width: `${size}px`, height: `${size}px` }}></div>
  );
}
