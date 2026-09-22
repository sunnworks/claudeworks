import type { EvaluationContext } from '../domain/rules';
import type { Answer, QuestionDefinition } from '../domain/types';
import { DurationInput } from './inputs/DurationInput';
import { MatrixInput } from './inputs/MatrixInput';
import { MultiChoiceInput } from './inputs/MultiChoiceInput';
import { NumberInput } from './inputs/NumberInput';
import { ScaleInput } from './inputs/ScaleInput';
import { SingleChoiceInput } from './inputs/SingleChoiceInput';
import { TextInput } from './inputs/TextInput';

interface Props {
  question: QuestionDefinition;
  answer: Answer | undefined;
  context: EvaluationContext;
  onChange: (answer: Answer | undefined) => void;
  onPlayOptionVideo: (label: string) => void;
}

/** 문항 유형에 따라 입력 컴포넌트를 고른다. */
export function QuestionRenderer({ question, answer, context, onChange, onPlayOptionVideo }: Props) {
  switch (question.type) {
    case 'single_choice':
      return (
        <SingleChoiceInput
          question={question}
          answer={answer}
          onChange={onChange}
          onPlayOptionVideo={onPlayOptionVideo}
        />
      );
    case 'multi_choice':
      return (
        <MultiChoiceInput
          question={question}
          answer={answer}
          onChange={onChange}
          onPlayOptionVideo={onPlayOptionVideo}
        />
      );
    case 'number':
      return <NumberInput question={question} answer={answer} onChange={onChange} />;
    case 'duration':
      return <DurationInput question={question} answer={answer} onChange={onChange} />;
    case 'text':
      return <TextInput question={question} answer={answer} onChange={onChange} />;
    case 'scale':
      return <ScaleInput question={question} answer={answer} onChange={onChange} />;
    case 'matrix':
      return (
        <MatrixInput
          question={question}
          answer={answer}
          context={context}
          onChange={onChange}
          onPlayOptionVideo={onPlayOptionVideo}
        />
      );
  }
}
