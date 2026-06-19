import React from 'react';

import { MonitorOutlined, PhoneIphoneOutlined } from '@mui/icons-material';
import { Box, Stack, SxProps, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';

import { BRAND_ACCENT } from '../../brand';
import EditorBlock from '../../documents/editor/EditorBlock';
import {
  setSelectedScreenSize,
  useDocument,
  useSelectedMainTab,
  useSelectedScreenSize,
} from '../../documents/editor/EditorContext';
import ToggleInspectorPanelButton from '../InspectorDrawer/ToggleInspectorPanelButton';
import { renderHtmlWithMeta } from '../../utils';

import DownloadJson from './DownloadJson';
import HtmlPanel from './HtmlPanel';
import ImportJson from './ImportJson';
import JsonPanel from './JsonPanel';
import MainTabsGroup from './MainTabsGroup';
import PreviewIframe from './PreviewIframe';

export default function TemplatePanel() {
  const document = useDocument();
  const selectedMainTab = useSelectedMainTab();
  const selectedScreenSize = useSelectedScreenSize();

  let mainBoxSx: SxProps = {
    height: '100%',
  };
  if (selectedScreenSize === 'mobile') {
    mainBoxSx = {
      ...mainBoxSx,
      margin: '32px auto',
      width: 370,
      height: 800,
      boxShadow:
        'rgba(33, 36, 67, 0.04) 0px 10px 20px, rgba(33, 36, 67, 0.04) 0px 2px 6px, rgba(33, 36, 67, 0.04) 0px 0px 1px',
    };
  }

  const handleScreenSizeChange = (_: unknown, value: unknown) => {
    switch (value) {
      case 'mobile':
      case 'desktop':
        setSelectedScreenSize(value);
        return;
      default:
        setSelectedScreenSize('desktop');
    }
  };

  const renderMainPanel = () => {
    switch (selectedMainTab) {
      case 'editor':
        return (
          <Box className="lm-brand-canvas" sx={mainBoxSx}>
            <EditorBlock id="root" />
          </Box>
        );
      case 'preview':
        // True WYSIWYG: render the real exported email HTML in an iframe so the
        // preview matches the sent email exactly (responsive stacking, reverse-on-
        // mobile, links, equal-height) — driven by the email's own media queries at
        // the iframe's width. The mobile toggle's 370px frame triggers the stack.
        return (
          <Box className="lm-brand-canvas" sx={mainBoxSx}>
            <PreviewIframe
              html={renderHtmlWithMeta(document, { rootBlockId: 'root' })}
              fillHeight={selectedScreenSize === 'mobile'}
            />
          </Box>
        );
      case 'html':
        return <HtmlPanel />;
      case 'json':
        return <JsonPanel />;
    }
  };

  return (
    <>
      {/* Brand accent on text links in the editor/preview canvas, mirroring the
          email export. Buttons (links with an inline background-color) are
          excluded. Scoped to the canvas so editor chrome is unaffected. */}
      <style>
        {`.lm-brand-canvas a:not([style*="background"]){color:${BRAND_ACCENT} !important}` +
          // All content images get a soft 8px radius (mirrors brandHeadStyle);
          // images with an explicit inline radius keep their own.
          `.lm-brand-canvas img{border-radius:8px}` +
          // Equal-height cards. The Editor tab lays columns out with flexbox (see
          // ColumnsContainerEditor) so a single-card column (.lm-col-fill) is a
          // flex column of definite height; grow the card to fill it. The Preview
          // tab uses the table renderer, so the card is the cell's only child.
          `.lm-brand-canvas .lm-col-fill>.MuiBox-root{flex:1 1 auto;min-height:0}` +
          `.lm-brand-canvas .lm-col-fill>.MuiBox-root>div{height:100%}` +
          // Preview tab renders the email's table; the cell needs an explicit
          // height for the card's height:100% to resolve in the browser (matches
          // brandHeadStyle). Only the Preview tab has tables, so this is inert
          // for the flex-based Editor tab.
          `.lm-brand-canvas td[style*="content-box"]{height:100% !important}` +
          `.lm-brand-canvas td[style*="content-box"]>div[style*="background"]:only-child{height:100% !important}`}
      </style>
      <Stack
        sx={{
          height: 49,
          borderBottom: 1,
          borderColor: 'divider',
          backgroundColor: 'white',
          top: 0,
          px: 1,
        }}
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Stack px={2} direction="row" gap={2} width="100%" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2}>
            <MainTabsGroup />
          </Stack>
          <Stack direction="row" spacing={2}>
            <DownloadJson />
            <ImportJson />
            <ToggleButtonGroup value={selectedScreenSize} exclusive size="small" onChange={handleScreenSizeChange}>
              <ToggleButton value="desktop">
                <Tooltip title="Desktop view">
                  <MonitorOutlined fontSize="small" />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="mobile">
                <Tooltip title="Mobile view">
                  <PhoneIphoneOutlined fontSize="small" />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
        <ToggleInspectorPanelButton />
      </Stack>
      <Box sx={{ height: 'calc(100vh - 49px)', overflow: 'auto', minWidth: 370 }}>{renderMainPanel()}</Box>
    </>
  );
}
