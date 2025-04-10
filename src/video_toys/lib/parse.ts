/* tslint:disable */

export const parseJSON = (str: string) => {
  const start = str.indexOf('{');
  const end = str.lastIndexOf('}') + 1;
  return JSON.parse(str.substring(start, end));
};

export const parseHTML = (str: string, opener: string, closer: string) => {
  const start = str.indexOf('<!DOCTYPE html>');
  const end = str.lastIndexOf(closer);
  return str.substring(start, end);
};
