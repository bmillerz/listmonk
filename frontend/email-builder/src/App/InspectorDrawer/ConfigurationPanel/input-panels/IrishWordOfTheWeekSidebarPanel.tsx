import React, { useState } from 'react';

import IrishWordOfTheWeekPropsSchema, {
  IrishWordOfTheWeekProps,
} from '../../../../documents/blocks/IrishWordOfTheWeek/IrishWordOfTheWeekPropsSchema';

import BaseSidebarPanel from './helpers/BaseSidebarPanel';
import TextInput from './helpers/inputs/TextInput';
import MultiStylePropertyPanel from './helpers/style-inputs/MultiStylePropertyPanel';

type IrishWordOfTheWeekSidebarPanelProps = {
  data: IrishWordOfTheWeekProps;
  setData: (v: IrishWordOfTheWeekProps) => void;
};

export default function IrishWordOfTheWeekSidebarPanel({ data, setData }: IrishWordOfTheWeekSidebarPanelProps) {
  const [, setErrors] = useState<Zod.ZodError | null>(null);

  const updateData = (next: unknown) => {
    const res = IrishWordOfTheWeekPropsSchema.safeParse(next);
    if (res.success) {
      setData(res.data);
      setErrors(null);
    } else {
      setErrors(res.error);
    }
  };

  const updateProp = (key: string, value: string) => updateData({ ...data, props: { ...data.props, [key]: value } });

  return (
    <BaseSidebarPanel title="Irish Word of the Week">
      <TextInput label="Word" defaultValue={data.props?.word ?? ''} onChange={(v) => updateProp('word', v)} />
      <TextInput
        label="Pronunciation (IPA)"
        defaultValue={data.props?.pronunciation ?? ''}
        onChange={(v) => updateProp('pronunciation', v)}
      />
      <TextInput
        label="Part of speech"
        defaultValue={data.props?.partOfSpeech ?? ''}
        onChange={(v) => updateProp('partOfSpeech', v)}
      />
      <TextInput
        label="Definitions (markdown)"
        rows={7}
        defaultValue={data.props?.definitions ?? ''}
        onChange={(v) => updateProp('definitions', v)}
      />
      <TextInput
        label="Origin (markdown)"
        rows={4}
        defaultValue={data.props?.origin ?? ''}
        onChange={(v) => updateProp('origin', v)}
      />

      <MultiStylePropertyPanel
        names={['padding']}
        value={data.style}
        onChange={(style) => updateData({ ...data, style })}
      />
    </BaseSidebarPanel>
  );
}
