import { boldMarkup, boldRuns } from '@barbon-performance-analysis/core';
import type { JSONContent } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { Placeholder, UndoRedo } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';
import { cx } from '../lib/cx';

interface RichTextFieldProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  className?: string;
}

// The coach sees real bold and toggles it with Ctrl+B; what is stored stays plain text with **word** marks, one paragraph per
// line, so the PDF, the mobile app and everything already saved read it unchanged.
const toDoc = (value: string): JSONContent => ({
  type: 'doc',
  content: value.split('\n').map((line) => ({
    type: 'paragraph',
    content: boldRuns(line)
      .filter((run) => run.text)
      .map((run) => ({ type: 'text', text: run.text, marks: run.bold ? [{ type: 'bold' }] : undefined })),
  })),
});

const toValue = (doc: JSONContent): string =>
  (doc.content ?? [])
    .map((paragraph) =>
      boldMarkup(
        (paragraph.content ?? []).map((node) => ({
          text: node.text ?? '',
          bold: node.marks?.some((mark) => mark.type === 'bold') ?? false,
        })),
      ),
    )
    .join('\n');

export function RichTextField({ value, onChange, label, placeholder, className }: RichTextFieldProps) {
  // The editor is built once, so its update handler reads the latest onChange through a ref.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    extensions: [Document, Paragraph, Text, Bold, UndoRedo, Placeholder.configure({ placeholder })],
    content: toDoc(value),
    editorProps: { attributes: { 'aria-label': label, 'aria-multiline': 'true', role: 'textbox' } },
    onUpdate: ({ editor: current }) => onChangeRef.current(toValue(current.getJSON())),
  });

  // The parent resets the value on load or discard; typing round-trips to the same string.
  useEffect(() => {
    if (toValue(editor.getJSON()) !== value) {
      editor.commands.setContent(toDoc(value), { emitUpdate: false });
    }
  }, [editor, value]);

  return <EditorContent editor={editor} className={cx('rich-text', className)} />;
}
