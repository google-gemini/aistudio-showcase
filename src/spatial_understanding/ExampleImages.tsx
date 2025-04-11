/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
import {ImageSrcAtom, IsUploadedImageAtom} from './atoms';
import {imageOptions} from './consts';
import {useResetState} from './hooks';

export function ExampleImages() {
  const [, setImageSrc] = useAtom(ImageSrcAtom);
  const [, setIsUploadedImage] = useAtom(IsUploadedImageAtom);
  const resetState = useResetState();
  return (
    <div className="flex flex-wrap items-start gap-3 shrink-0 w-[190px]">
      {imageOptions.map((image) => (
        <button
          key={image}
          className="p-0 w-[56px] h-[56px] relative overflow-hidden"
          onClick={() => {
            setIsUploadedImage(false);
            setImageSrc(image);
            resetState();
          }}>
          <img
            src={image}
            className="absolute left-0 top-0 w-full h-full object-cover"
          />
        </button>
      ))}
    </div>
  );
}
