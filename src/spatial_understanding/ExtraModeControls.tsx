/* tslint:disable */
// Copyright 2024 Google LLC

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//     https://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {useAtom} from 'jotai';
import {
  BoundingBoxes2DAtom,
  BoundingBoxes3DAtom,
  BoundingBoxMasksAtom,
  DetectTypeAtom,
  DrawModeAtom,
  FOVAtom,
  HoveredBoxAtom,
  LinesAtom,
  PointsAtom,
  ShareStream,
} from './atoms';
import {Palette} from './Palette';

export function ExtraModeControls() {
  const [, setBoundingBoxes2D] = useAtom(BoundingBoxes2DAtom);
  const [, setBoundingBoxes3D] = useAtom(BoundingBoxes3DAtom);
  const [, setBoundingBoxMasks] = useAtom(BoundingBoxMasksAtom);
  const [stream, setStream] = useAtom(ShareStream);
  const [detectType] = useAtom(DetectTypeAtom);
  const [fov, setFoV] = useAtom(FOVAtom);
  const [, setPoints] = useAtom(PointsAtom);
  const [, _setHoveredBox] = useAtom(HoveredBoxAtom);
  const [drawMode, setDrawMode] = useAtom(DrawModeAtom);
  const [, setLines] = useAtom(LinesAtom);

  const showExtraBar = stream || detectType === '3D bounding boxes';

  return (
    <>
      {detectType === '3D bounding boxes' ? (
        <div className="flex gap-3 px-3 py-3 items-center justify-center bg-[var(--accent-color)] text-[var(--bg-color)] text-center border-t">
          <div className="text-lg">🚧</div> 3d bounding boxes is a preliminary
          model capability. Use 2D bounding boxes for higher accuracy.
        </div>
      ) : null}
      {drawMode ? (
        <div className="flex gap-3 px-3 py-3 items-center justify-between border-t">
          <div style={{width: 200}}></div>
          <div className="grow flex justify-center">
            <Palette />
          </div>
          <div className="flex gap-3">
            <div className="flex gap-3">
              <button
                className="flex gap-3 text-sm secondary"
                onClick={() => {
                  setLines([]);
                }}>
                <div className="text-xs">🗑️</div>
                Clear
              </button>
            </div>
            <div className="flex gap-3">
              <button
                className="flex gap-3 secondary"
                onClick={() => {
                  setDrawMode(false);
                }}>
                <div className="text-sm">✅</div>
                <div>Done</div>
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {showExtraBar ? (
        <div className="flex gap-3 px-3 py-3 border-t items-center justify-center">
          {stream ? (
            <button
              className="flex gap-3 text-sm items-center secondary"
              onClick={() => {
                stream.getTracks().forEach((track) => track.stop());
                setStream(null);
                setBoundingBoxes2D([]);
                setBoundingBoxes3D([]);
                setBoundingBoxMasks([]);
                setPoints([]);
              }}>
              <div className="text-xs">🔴</div>
              <div className="whitespace-nowrap">Stop screenshare</div>
            </button>
          ) : null}
          {detectType === '3D bounding boxes' ? (
            <>
              <div>FOV</div>
              <input
                className="w-full"
                type="range"
                min="30"
                max="120"
                value={fov}
                onChange={(e) => setFoV(+e.target.value)}
              />
              <div>{fov}</div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
