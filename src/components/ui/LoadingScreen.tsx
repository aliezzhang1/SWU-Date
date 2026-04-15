interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = '加载中...' }: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__orb" />
      <div className="loading-screen__content">
        <span className="eyebrow">SWU Date</span>
        <h1>把缘分慢慢加载出来</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
