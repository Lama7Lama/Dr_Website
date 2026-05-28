import React, { useState } from 'react';

interface ImageComparisonViewerProps {
  originalUrl: string;
  heatmapUrl: string;
}

const zoomOptions = [1, 2, 4];

const ImageComparisonViewer: React.FC<ImageComparisonViewerProps> = ({ originalUrl, heatmapUrl }) => {
  const [zoom, setZoom] = useState(1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {zoomOptions.map((factor) => (
          <button
            key={factor}
            className={`${zoom === factor ? 'premium-button-primary' : 'premium-button-secondary'} px-3 py-2 text-xs`}
            onClick={() => setZoom(factor)}
          >
            {factor}x
          </button>
        ))}
        <button className="premium-button-secondary px-3 py-2 text-xs" onClick={() => setZoom(1)}>
          Fit
        </button>

        <a href={originalUrl} download className="premium-button-secondary ms-auto px-4 py-2 text-xs">
          Download Original
        </a>
        <a href={heatmapUrl} download className="premium-button-secondary px-4 py-2 text-xs">
          Download Heatmap
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ImageStage zoom={zoom} label="Original">
          <img src={originalUrl} alt="original retina" className="absolute inset-0 m-auto max-h-full max-w-full rounded-[22px] border border-white/70 object-contain select-none" />
        </ImageStage>

        <ImageStage zoom={zoom} label="Heatmap">
          <img src={heatmapUrl} alt="heatmap retina" className="absolute inset-0 m-auto max-h-full max-w-full rounded-[22px] border border-white/70 object-contain select-none" />
        </ImageStage>
      </div>
    </div>
  );
};

const ImageStage: React.FC<{ zoom: number; label: string; children: React.ReactNode }> = ({ zoom, label, children }) => (
  <div className="premium-card-soft rounded-[28px] p-4">
    <div className="mb-3 inline-flex rounded-full border border-[rgba(7,25,82,0.08)] bg-white/70 px-3 py-1 text-xs font-bold text-[#071952]">
      {label}
    </div>
    <div className="rounded-[24px] border border-[rgba(7,25,82,0.08)] bg-[linear-gradient(180deg,rgba(210,224,251,0.18),rgba(255,255,255,0.86))] p-3">
      <div className="relative mx-auto h-[300px] w-[300px] max-w-full overflow-auto rounded-[20px]">
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center'
          }}
        >
          <div className="relative h-full w-full">{children}</div>
        </div>
      </div>
    </div>
  </div>
);

export default ImageComparisonViewer;
