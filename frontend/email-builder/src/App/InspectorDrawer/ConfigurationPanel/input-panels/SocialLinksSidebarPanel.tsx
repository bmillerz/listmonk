import React, { useState } from 'react';

import { FormatAlignCenterOutlined, FormatAlignLeftOutlined, FormatAlignRightOutlined } from '@mui/icons-material';
import { ToggleButton } from '@mui/material';

import SocialLinksPropsSchema, {
  SocialLinksProps,
} from '../../../../documents/blocks/SocialLinks/SocialLinksPropsSchema';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import RadioGroupInput from './helpers/inputs/RadioGroupInput';
import TextInput from './helpers/inputs/TextInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type SocialLinksSidebarPanelProps = {
  data: SocialLinksProps;
  setData: (v: SocialLinksProps) => void;
};

export default function SocialLinksSidebarPanel({ data, setData }: SocialLinksSidebarPanelProps) {
  const [, setErrors] = useState<Zod.ZodError | null>(null);

  const updateData = (next: unknown) => {
    const res = SocialLinksPropsSchema.safeParse(next);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const updateProp = (key: string, value: string) =>
    updateData({ ...data, props: { ...data.props, [key]: value } });

  return (
    <BaseSidebarPanel title="Social links">
      <TextInput label="Website URL" defaultValue={data.props?.website ?? ''} onChange={(v) => updateProp('website', v)} />
      <TextInput label="Facebook URL" defaultValue={data.props?.facebook ?? ''} onChange={(v) => updateProp('facebook', v)} />
      <TextInput
        label="Instagram URL"
        defaultValue={data.props?.instagram ?? ''}
        onChange={(v) => updateProp('instagram', v)}
      />
      <TextInput label="TikTok URL" defaultValue={data.props?.tiktok ?? ''} onChange={(v) => updateProp('tiktok', v)} />

      <RadioGroupInput
        label="Alignment"
        defaultValue={data.props?.alignment ?? 'left'}
        onChange={(alignment) => updateProp('alignment', alignment)}
      >
        <ToggleButton value="left">
          <FormatAlignLeftOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="center">
          <FormatAlignCenterOutlined fontSize="small" />
        </ToggleButton>
        <ToggleButton value="right">
          <FormatAlignRightOutlined fontSize="small" />
        </ToggleButton>
      </RadioGroupInput>

      <MultiStylePropertyPanel
        names={['backgroundColor', 'padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
