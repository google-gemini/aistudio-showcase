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
  BumpSessionAtom,
  ImageSentAtom,
  PointsAtom,
} from './atoms';

export function useResetState() {
  const [, setImageSent] = useAtom(ImageSentAtom);
  const [, setBoundingBoxes2D] = useAtom(BoundingBoxes2DAtom);
  const [, setBoundingBoxes3D] = useAtom(BoundingBoxes3DAtom);
  const [, setBoundingBoxMasks] = useAtom(BoundingBoxMasksAtom);
  const [, setPoints] = useAtom(PointsAtom);
  const [, setBumpSession] = useAtom(BumpSessionAtom);

  return () => {
    setImageSent(false);
    setBoundingBoxes2D([]);
    setBoundingBoxes3D([]);
    setBoundingBoxMasks([]);
    setBumpSession((prev) => prev + 1);
    setPoints([]);
  };
}
