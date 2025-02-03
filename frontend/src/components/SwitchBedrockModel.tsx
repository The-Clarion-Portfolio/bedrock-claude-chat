import { twMerge } from 'tailwind-merge';
import { BaseProps } from '../@types/common';
import useModel from '../hooks/useModel';
import Button from './Button';

type Props = BaseProps;

const SwitchBedrockModel: React.FC<Props> = (props) => {
  const { availableModels, modelId, setModelId } = useModel();

  return (
    <div
      className={twMerge(
        props.className,
        'flex justify-center gap-2 rounded-lg border border-light-gray bg-light-gray p-1 text-sm'
      )}
      style={{ backgroundColor: "#F1F3F3 !important", border: "none !important", padding: "0.8rem" }}>
      {availableModels.map((availableModel) => (
        <Button
          key={availableModel.modelId}
          className={twMerge(
            'flex w-40 flex-1 items-center rounded-lg p-2',
            modelId === availableModel.modelId
              ? ''
              : 'border-light-gray bg-white text-dark-gray'
          )}
          style={{ background: modelId === availableModel.modelId ? "white" : "linear-gradient(to right, #4BC8EF, #4361EE)", color: modelId === availableModel.modelId ? "black" : "white" }}
          onClick={() => setModelId(availableModel.modelId)}
          children={<span>{availableModel.label}</span>}
        />
      ))}
    </div>
  );
};

export default SwitchBedrockModel;
