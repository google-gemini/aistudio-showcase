/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

const ToggleButton = ({ icon: Icon, label, isSelected, onClick }) => {
  const baseStyles = "inline-flex items-center gap-1 px-3.5 py-2.5 text-sm rounded-full transition-all duration-200";
  const selectedStyles = "bg-black text-white";
  const unselectedStyles = "bg-gray-200 text-gray-700";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseStyles} ${isSelected ? selectedStyles : unselectedStyles}`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
};

export default ToggleButton;
