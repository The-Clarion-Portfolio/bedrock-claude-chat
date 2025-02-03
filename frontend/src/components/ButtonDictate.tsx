import React from 'react';
import {PiMicrophoneLight, PiSpinnerGap} from 'react-icons/pi';
import { BaseProps } from '../@types/common';
import { twMerge } from 'tailwind-merge';

type Props = BaseProps & {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
};

const ButtonDictate: React.FC<Props> = (props) => {
  return (
    <button
      className={twMerge(
        'dictation-button flex items-center justify-center rounded-xl bg-aws-sea-blue  p-2 text-xl  text-white hover:bg-aws-sea-blue-hover',
        props.disabled ? 'opacity-30' : '',
        props.className
      )}
      onClick={props.onClick}
      disabled={props.disabled || props.loading}>
      {props.loading ? (
        <PiSpinnerGap className="animate-spin" />
      ) : (
        <PiMicrophoneLight />
      )}
    </button>
  );
};

export default ButtonDictate;
