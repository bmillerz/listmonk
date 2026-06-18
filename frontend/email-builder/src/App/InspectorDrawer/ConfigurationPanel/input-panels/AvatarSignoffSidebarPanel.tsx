import React, { useState } from 'react';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { ToggleButton } from '@mui/material';

import AvatarSignoffPropsSchema, {
  AvatarSignoffProps,
} from '../../../../documents/blocks/AvatarSignoff/AvatarSignoffPropsSchema';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import RadioGroupInput from './helpers/inputs/RadioGroupInput';
import TextInput from './helpers/inputs/TextInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type AvatarSignoffSidebarPanelProps = {
  data: AvatarSignoffProps;
  setData: (v: AvatarSignoffProps) => void;
};

export default function AvatarSignoffSidebarPanel({ data, setData }: AvatarSignoffSidebarPanelProps) {
  const [, setErrors] = useState<Zod.ZodError | null>(null);

  const updateData = (next: unknown) => {
    const res = AvatarSignoffPropsSchema.safeParse(next);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const updateProp = (key: string, value: unknown) =>
    updateData({ ...data, props: { ...data.props, [key]: value } });

  return (
    <BaseSidebarPanel title="Avatar signoff">
      <TextInput
        label="Image URL"
        className="image-url"
        defaultValue={data.props?.imageUrl ?? ''}
        onChange={(v) => updateProp('imageUrl', v)}
      />
      {/* Same media-library hook as the Image block: posts to the parent, which
          opens the picker and writes the chosen URL back into `.image-url`. */}
      <a
        href="#"
        className="select-media"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginTop: '5px' }}
        onClick={(e) => {
          window.parent.postMessage('visualeditor.select-media', '*');
          e.preventDefault();
        }}
      >
        <CloudUploadIcon style={{ fontSize: '1rem' }} /> Select media
      </a>
      <TextInput label="Name" defaultValue={data.props?.name ?? ''} onChange={(v) => updateProp('name', v)} />
      <TextInput
        label="Secondary line"
        defaultValue={data.props?.subtitle ?? ''}
        onChange={(v) => updateProp('subtitle', v)}
      />
      <RadioGroupInput
        label="Image shape"
        defaultValue={data.props?.shape ?? 'circle'}
        onChange={(shape) => updateProp('shape', shape)}
      >
        <ToggleButton value="circle">Circle</ToggleButton>
        <ToggleButton value="square">Square</ToggleButton>
      </RadioGroupInput>

      <MultiStylePropertyPanel
        names={['padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
