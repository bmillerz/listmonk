import React, { useRef, useState } from 'react';

import { InputProps, TextField } from '@mui/material';

type Props = {
  label: string;
  rows?: number;
  placeholder?: string;
  helperText?: string | JSX.Element;
  InputProps?: InputProps;
  defaultValue: string;
  className?: string;
  onChange: (v: string) => void;
};
export default function TextInput({ helperText, label, placeholder, rows, InputProps, defaultValue, className, onChange }: Props) {
  const [value, setValue] = useState(defaultValue);
  // Sync when the parent supplies a new defaultValue (e.g. the Global/Styles panel
  // stays mounted with a static key while the document loads asynchronously after
  // mount — without this the field would keep its initial stale value and look
  // unsaved). During typing the new defaultValue equals what was typed, so this
  // never clobbers in-progress input.
  const lastDefaultValue = useRef(defaultValue);
  if (defaultValue !== lastDefaultValue.current) {
    lastDefaultValue.current = defaultValue;
    if (defaultValue !== value) {
      setValue(defaultValue);
    }
  }
  const isMultiline = typeof rows === 'number' && rows > 1;
  return (
    <TextField
      fullWidth
      multiline={isMultiline}
      minRows={rows}
      variant={isMultiline ? 'outlined' : 'standard'}
      label={label}
      placeholder={placeholder}
      helperText={helperText}
      InputProps={InputProps}
      className={className}
      value={value}
      onChange={(ev) => {
        const v = ev.target.value;
        setValue(v);
        onChange(v);
      }}
    />
  );
}
