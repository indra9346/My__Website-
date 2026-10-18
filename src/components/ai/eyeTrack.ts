// Pupil position in the eye intro, measured frame by frame from the video
// (iris centre and radius, as fractions of the 1920x1080 frame), smoothed.
// [video time (s), centre x, centre y, iris radius / frame height]
export const PUPIL_TRACK: [number, number, number, number][] = [
  [3.0, 0.551, 0.553, 0.321], [3.1, 0.536, 0.559, 0.312], [3.2, 0.525, 0.543, 0.299], [3.3, 0.508, 0.505, 0.276],
  [3.4, 0.49, 0.478, 0.258], [3.5, 0.482, 0.473, 0.254], [3.6, 0.479, 0.472, 0.255], [3.7, 0.476, 0.471, 0.256],
  [3.8, 0.476, 0.472, 0.256], [3.9, 0.478, 0.473, 0.257], [4.0, 0.479, 0.474, 0.258], [4.1, 0.483, 0.474, 0.26],
  [4.2, 0.485, 0.475, 0.261], [4.3, 0.485, 0.475, 0.264], [4.4, 0.486, 0.475, 0.269], [4.5, 0.487, 0.475, 0.274],
  [4.6, 0.489, 0.474, 0.279], [4.7, 0.489, 0.474, 0.285], [4.8, 0.489, 0.475, 0.292], [4.9, 0.489, 0.474, 0.3],
  [5.0, 0.489, 0.474, 0.309], [5.1, 0.487, 0.473, 0.319], [5.2, 0.486, 0.471, 0.327], [5.3, 0.486, 0.47, 0.335],
  [5.4, 0.485, 0.468, 0.345], [5.5, 0.484, 0.467, 0.358], [5.6, 0.482, 0.466, 0.37], [5.7, 0.482, 0.466, 0.383],
  [5.8, 0.482, 0.465, 0.397], [5.9, 0.484, 0.465, 0.413], [6.0, 0.486, 0.468, 0.434], [6.1, 0.489, 0.474, 0.455],
  [6.2, 0.496, 0.486, 0.474],
];

/** Key moments of the clip (video time, seconds). */
export const EYE_TIMELINE = {
  lockOn: 3.0, // eye fully open, light appears in the pupil
  burst: 6.2, // light bursts as the camera enters the pupil
  tunnelStart: 6.35, // energy tunnel
  whiteStart: 7.85, // white flash builds
  end: 8.05, // hand over to the 3D warp
};

export interface CoverBox {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** object-fit: cover mapping of a 1920x1080 video into a W x H box. */
export function coverBox(width: number, height: number, videoW = 1920, videoH = 1080): CoverBox {
  const scale = Math.max(width / videoW, height / videoH);
  return { scale, offsetX: (width - videoW * scale) / 2, offsetY: (height - videoH * scale) / 2 };
}

/** Converts a point in video fractions to screen pixels for a cover-fitted video. */
export function toScreen(box: CoverBox, fx: number, fy: number, videoW = 1920, videoH = 1080) {
  return { x: box.offsetX + fx * videoW * box.scale, y: box.offsetY + fy * videoH * box.scale };
}
