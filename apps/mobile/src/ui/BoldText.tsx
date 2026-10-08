import { boldRuns, fonts } from '@barbon-performance-analysis/core';
import { Fragment } from 'react';
import { type StyleProp, Text, type TextStyle } from 'react-native';

// Coach texts mark bold with **word**. A custom font has no synthetic bold, so the bold runs switch
// to the bold face instead of setting fontWeight.
export function BoldText({ text, style }: { text: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 ? '\n' : null}
          {boldRuns(line).map((run, runIndex) =>
            run.bold ? (
              <Text key={runIndex} style={{ fontFamily: fonts.bodyBold }}>
                {run.text}
              </Text>
            ) : (
              run.text
            ),
          )}
        </Fragment>
      ))}
    </Text>
  );
}
