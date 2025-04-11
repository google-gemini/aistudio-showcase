/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */

import {Example} from '@/lib/types';
import {type Dispatch, type SetStateAction, createContext} from 'react';

export interface Data {
  examples: Example[];
  setExamples: Dispatch<SetStateAction<Example[]>>;
  defaultExample: Example;
  isLoading: boolean;
}

export const DataContext = createContext<Data>(null);
