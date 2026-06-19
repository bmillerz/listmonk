import React from 'react';

import {
  AccountCircleOutlined,
  BadgeOutlined,
  Crop32Outlined,
  HMobiledataOutlined,
  HorizontalRuleOutlined,
  HtmlOutlined,
  ImageOutlined,
  LibraryAddOutlined,
  NotesOutlined,
  ShareOutlined,
  SmartButtonOutlined,
  TranslateOutlined,
  ViewColumnOutlined,
} from '@mui/icons-material';

import { TEditorBlock } from '../../../../editor/core';

type TButtonProps = {
  label: string;
  icon: JSX.Element;
  block: () => TEditorBlock;
};
export const BUTTONS: TButtonProps[] = [
  {
    label: 'Heading',
    icon: <HMobiledataOutlined />,
    block: () => ({
      type: 'Heading',
      data: {
        props: { text: 'Heading' },
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
        },
      },
    }),
  },
  {
    label: 'Text',
    icon: <NotesOutlined />,
    block: () => ({
      type: 'Text',
      data: {
        props: { text: 'My new text block', markdown: true },
        style: {
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
          fontWeight: 'normal',
          fontSize: 14,
        },
      },
    }),
  },

  {
    label: 'Button',
    icon: <SmartButtonOutlined />,
    block: () => ({
      type: 'Button',
      data: {
        props: {
          text: 'Button',
          url: 'https://listmonk.app',
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Image',
    icon: <ImageOutlined />,
    block: () => ({
      type: 'Image',
      data: {
        props: {
          url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Placeholder_view_vector.svg',
          alt: 'Sample product',
          contentAlignment: 'middle',
          linkHref: null,
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Avatar',
    icon: <AccountCircleOutlined />,
    block: () => ({
      type: 'Avatar',
      data: {
        props: {
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
          shape: 'circle',
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Divider',
    icon: <HorizontalRuleOutlined />,
    block: () => ({
      type: 'Divider',
      data: {
        style: { padding: { top: 16, right: 0, bottom: 16, left: 0 } },
        props: {
          lineColor: '#CCCCCC',
        },
      },
    }),
  },
  {
    label: 'Spacer',
    icon: <Crop32Outlined />,
    block: () => ({
      type: 'Spacer',
      data: {},
    }),
  },
  {
    label: 'Html',
    icon: <HtmlOutlined />,
    block: () => ({
      type: 'Html',
      data: {
        props: { contents: '<strong>Hello world</strong>' },
        style: {
          fontSize: 16,
          textAlign: null,
          padding: { top: 16, bottom: 16, left: 24, right: 24 },
        },
      },
    }),
  },
  {
    label: 'Columns',
    icon: <ViewColumnOutlined />,
    block: () => ({
      type: 'ColumnsContainer',
      data: {
        props: {
          columnsGap: 16,
          columnsCount: 3,
          columns: [{ childrenIds: [] }, { childrenIds: [] }, { childrenIds: [] }],
        },
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Container',
    icon: <LibraryAddOutlined />,
    block: () => ({
      type: 'Container',
      data: {
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
      },
    }),
  },
  {
    label: 'Irish Word',
    icon: <TranslateOutlined />,
    block: () => ({
      type: 'IrishWordOfTheWeek',
      data: {
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        props: {
          word: 'yoke',
          pronunciation: '/jəʊk/',
          partOfSpeech: 'noun · Hiberno-English',
          definitions: `**1.** An all-purpose word for "thing" — the name of which you've either forgotten or never knew in the first place.
> "Don't forget that yoke."

**2.** *(of a person)* Someone you're not especially mad about; a piece of work.
> "Karen's brother is some yoke!"`,
          origin: `**Origin.** One of the older bits of Irish slang, first recorded in print in 1894 in *Kerrigan's Quality* by Dubliner Jane Barlow — a 130-year tradition. ☘️`,
        },
      },
    }),
  },
  {
    label: 'Signoff',
    icon: <BadgeOutlined />,
    block: () => ({
      type: 'AvatarSignoff',
      data: {
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        props: {
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
          name: 'Meghan',
          subtitle: 'Ireland Tips for Travellers',
          shape: 'circle',
        },
      },
    }),
  },

  {
    label: 'Social',
    icon: <ShareOutlined />,
    block: () => ({
      type: 'SocialLinks',
      data: {
        style: { padding: { top: 16, bottom: 16, left: 24, right: 24 } },
        props: {
          website: 'https://irelandtipsfortravellers.com',
          facebook: 'https://facebook.com/',
          instagram: 'https://instagram.com/',
          tiktok: 'https://tiktok.com/',
        },
      },
    }),
  },

  // { label: 'ProgressBar', icon: <ProgressBarOutlined />, block: () => ({}) },
  // { label: 'LoopContainer', icon: <ViewListOutlined />, block: () => ({}) },
];
