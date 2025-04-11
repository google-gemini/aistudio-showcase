/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/* tslint:disable */

import App from '@/App';
import {DataContext} from '@/context';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {Example} from './lib/types';

function DataProvider({children}) {
  const [examples, setExamples] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    fetch('data/examples.json')
      .then((res) => res.json())
      .then((fetchedData) => {
        setExamples(fetchedData);
        setIsLoading(false);
      });
  }, []);

  async function saveExamples(examples: Example[]) {
    // Remove duplicates.
    const exampleMap = new Map(
      examples.map((example) => [example.url, example]),
    );
    examples = Array.from(exampleMap.values());
    console.log('saving examples');
    const resp = await fetch('data/examples.json', {
      method: 'POST',
      body: JSON.stringify(examples),
    });
    if (!resp.ok) {
      throw new Error('Error saving examples');
    }
    console.log('saved examples');
    return setExamples(examples);
  }

  const empty = {title: '', url: '', spec: '', code: ''};

  const value = {
    examples,
    isLoading,
    setExamples: saveExamples,
    defaultExample: examples ? examples[0] : empty,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <DataProvider>
    <App />
  </DataProvider>,
);
