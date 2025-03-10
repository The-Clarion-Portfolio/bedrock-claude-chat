import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputText from '../components/InputText';
import Button from '../components/Button';
import useBot from '../hooks/useBot';
import { useNavigate, useParams } from 'react-router-dom';
import { PiCaretLeft, PiNote, PiPlus, PiTrash } from 'react-icons/pi';
import Textarea from '../components/Textarea';
import DialogInstructionsSamples from '../components/DialogInstructionsSamples';
import ButtonIcon from '../components/ButtonIcon';
import { produce } from 'immer';
import Alert from '../components/Alert';
import KnowledgeFileUploader from '../components/KnowledgeFileUploader';
import GenerationConfig from '../components/GenerationConfig';
import {
  BotFile,
  ConversationQuickStarter,
  EmdeddingParams,
  SearchParams,
} from '../@types/bot';

import { ulid } from 'ulid';
import {
  DEFAULT_EMBEDDING_CONFIG,
  EDGE_EMBEDDING_PARAMS,
  EDGE_GENERATION_PARAMS,
  EDGE_MISTRAL_GENERATION_PARAMS,
  DEFAULT_GENERATION_CONFIG,
  DEFAULT_MISTRAL_GENERATION_CONFIG,
  DEFAULT_SEARCH_CONFIG,
  EDGE_SEARCH_PARAMS,
  TooltipDirection,
} from '../constants';
import { Slider } from '../components/Slider';
import ExpandableDrawerGroup from '../components/ExpandableDrawerGroup';
import useErrorMessage from '../hooks/useErrorMessage';
import Help from '../components/Help';
import Toggle from '../components/Toggle';
import { useAgent } from '../features/agent/hooks/useAgent';
import { AgentTool } from '../features/agent/types';
import { AvailableTools } from '../features/agent/components/AvailableTools';

const edgeGenerationParams =
  import.meta.env.VITE_APP_ENABLE_MISTRAL === 'true'
    ? EDGE_MISTRAL_GENERATION_PARAMS
    : EDGE_GENERATION_PARAMS;

const defaultGenerationConfig =
  import.meta.env.VITE_APP_ENABLE_MISTRAL === 'true'
    ? DEFAULT_MISTRAL_GENERATION_CONFIG
    : DEFAULT_GENERATION_CONFIG;


const BotEditPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { botId: paramsBotId } = useParams();
  const { getMyBot, registerBot, updateBot } = useBot();
  const { availableTools } = useAgent();

  const [isLoading, setIsLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instruction, setInstruction] = useState('');
  const [urls, setUrls] = useState<string[]>(['']);
  const [files, setFiles] = useState<BotFile[]>([]);
  const [embeddingParams, setEmbeddingParams] = useState<EmdeddingParams>({
    chunkSize: DEFAULT_EMBEDDING_CONFIG.chunkSize,
    chunkOverlap: DEFAULT_EMBEDDING_CONFIG.chunkOverlap,
    enablePartitionPdf: DEFAULT_EMBEDDING_CONFIG.enablePartitionPdf,
  });
  const [addedFilenames, setAddedFilenames] = useState<string[]>([]);
  const [unchangedFilenames, setUnchangedFilenames] = useState<string[]>([]);
  const [deletedFilenames, setDeletedFilenames] = useState<string[]>([]);
  const [displayRetrievedChunks, setDisplayRetrievedChunks] = useState(true);
  const [maxTokens, setMaxTokens] = useState<number>(
    defaultGenerationConfig.maxTokens
  );
  const [topK, setTopK] = useState<number>(defaultGenerationConfig.topK);
  const [topP, setTopP] = useState<number>(defaultGenerationConfig.topP);
  const [temperature, setTemperature] = useState<number>(
    defaultGenerationConfig.temperature
  );
  const [stopSequences, setStopSequences] = useState<string>(
    defaultGenerationConfig.stopSequences?.join(',') || ''
  );
  const [searchParams, setSearchParams] = useState<SearchParams>(
    DEFAULT_SEARCH_CONFIG
  );
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [conversationQuickStarters, setConversationQuickStarters] = useState<
    ConversationQuickStarter[]
  >([
    {
      title: '',
      example: '',
    },
  ]);

  const {
    errorMessages,
    setErrorMessage: setErrorMessages,
    clearAll: clearErrorMessages,
  } = useErrorMessage();

  const isNewBot = useMemo(() => {
    return paramsBotId ? false : true;
  }, [paramsBotId]);

  const botId = useMemo(() => {
    return isNewBot ? ulid() : (paramsBotId ?? '');
  }, [isNewBot, paramsBotId]);

  useEffect(() => {
    if (!isNewBot) {
      setIsLoading(true);
      getMyBot(botId)
        .then((bot) => {
          // Disallow editing of bots created under opposite VITE_APP_ENABLE_KB environment state
          if (bot.bedrockKnowledgeBase) {
            navigate('/');
            return;
          }

          setTools(bot.agent.tools);
          setTitle(bot.title);
          setDescription(bot.description);
          setInstruction(bot.instruction);
          setUrls(
            bot.knowledge.sourceUrls.length === 0
              ? ['']
              : bot.knowledge.sourceUrls
          );
          setFiles(
            bot.knowledge.filenames.map((filename) => ({
              filename,
              status: 'UPLOADED',
            }))
          );
          setEmbeddingParams(bot.embeddingParams);
          setSearchParams(bot.searchParams);
          setTopK(bot.generationParams.topK);
          setTopP(bot.generationParams.topP);
          setTemperature(bot.generationParams.temperature);
          setMaxTokens(bot.generationParams.maxTokens);
          setStopSequences(bot.generationParams.stopSequences.join(','));
          setUnchangedFilenames([...bot.knowledge.filenames]);
          setDisplayRetrievedChunks(bot.displayRetrievedChunks);
          if (bot.syncStatus === 'FAILED') {
            setErrorMessages(
              isSyncChunkError(bot.syncStatusReason)
                ? 'syncChunkError'
                : 'syncError',
              bot.syncStatusReason
            );
          }
          setConversationQuickStarters(
            bot.conversationQuickStarters.length > 0
              ? bot.conversationQuickStarters
              : [
                  {
                    title: '',
                    example: '',
                  },
                ]
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewBot, botId]);

  const isSyncChunkError = useCallback((syncErrorMessage: string) => {
    const pattern =
      /Got a larger chunk overlap \(\d+\) than chunk size \(\d+\), should be smaller\./;
    return pattern.test(syncErrorMessage);
  }, []);

  const onChangeUrl = useCallback(
    (url: string, idx: number) => {
      setUrls(
        produce(urls, (draft) => {
          draft[idx] = url;
        })
      );
    },
    [urls]
  );

  const onClickAddUrl = useCallback(() => {
    setUrls([...urls, '']);
  }, [urls]);

  const onClickAddUrlArray = useCallback(() => {
    const arrayStr = prompt("Paste the JSON array of urls!");

    if (arrayStr === null || arrayStr === "") {
      return;
    }

    try {
      const newUrls = JSON.parse(arrayStr);
      setUrls([...urls, ...newUrls]);
    }
    catch (e: unknown) {
      if (e instanceof SyntaxError) {
        alert("Array could not be parsed!");
        return;
      }

      throw e;
    }
  }, [urls]);

  const onClickAddUrlArrayFromFile = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'jsonFile';
    fileInput.accept = '.json';

    fileInput.addEventListener('change', () => {
      if (fileInput.files) {
        for (const file of fileInput.files) {
          if (file) {
            file.text().then(arrayStr => {
              if (arrayStr === null || arrayStr === "") {
                return;
              }

              try {
                const newUrls = JSON.parse(arrayStr);
                setUrls([...urls, ...newUrls]);
              } catch (e: unknown) {
                if (e instanceof SyntaxError) {
                  alert("Array could not be parsed!");
                  return;
                }

                throw e;
              }
            });
          }
        }
      }
    });

    fileInput.click();
  }, [urls]);

  const onClickClearUrls = useCallback(() => {
    setUrls(['']);
  }, [urls]);

  const onClickRemoveUrl = useCallback(
    (idx: number) => {
      setUrls(
        produce(urls, (draft) => {
          draft.splice(idx, 1);
          if (draft.length === 0) {
            draft.push('');
          }
          return;
        })
      );
    },
    [urls]
  );

  const removeUnchangedFilenames = useCallback(
    (filename: string) => {
      const idx = unchangedFilenames.findIndex(
        (unchangedFilename) => unchangedFilename === filename
      );
      if (idx > -1) {
        setUnchangedFilenames(
          produce(unchangedFilenames, (draft) => {
            draft.splice(idx, 1);
            return;
          })
        );
      }
    },
    [unchangedFilenames]
  );

  const removeAddedFilenames = useCallback(
    (filename: string) => {
      const idx = addedFilenames.findIndex(
        (addedFilename) => addedFilename === filename
      );
      if (idx > -1) {
        setAddedFilenames(
          produce(addedFilenames, (draft) => {
            draft.splice(idx, 1);
            return;
          })
        );
      }
    },
    [addedFilenames]
  );

  const removeDeletedFilenames = useCallback(
    (filename: string) => {
      const idx = deletedFilenames.findIndex(
        (deletedFilename) => deletedFilename === filename
      );
      if (idx > -1) {
        setDeletedFilenames(
          produce(deletedFilenames, (draft) => {
            draft.splice(idx, 1);
          })
        );
      }
    },
    [deletedFilenames]
  );

  const onAddFiles = useCallback(
    (botFiles: BotFile[]) => {
      setFiles(botFiles);
      setAddedFilenames(
        produce(addedFilenames, (draft) => {
          botFiles.forEach((file) => {
            if (file.status === 'UPLOADING') {
              if (!draft.includes(file.filename)) {
                draft.push(file.filename);
              }
              removeUnchangedFilenames(file.filename);
              removeDeletedFilenames(file.filename);
            }
          });
        })
      );
    },
    [addedFilenames, removeDeletedFilenames, removeUnchangedFilenames]
  );

  const onUpdateFiles = useCallback((botFiles: BotFile[]) => {
    setFiles(botFiles);
  }, []);

  const onDeleteFiles = useCallback(
    (botFiles: BotFile[], deletedFilename: string) => {
      setFiles(botFiles);

      if (!deletedFilenames.includes(deletedFilename)) {
        setDeletedFilenames(
          produce(deletedFilenames, (draft) => {
            draft.push(deletedFilename);
          })
        );
      }
      removeAddedFilenames(deletedFilename);
      removeUnchangedFilenames(deletedFilename);
    },
    [deletedFilenames, removeAddedFilenames, removeUnchangedFilenames]
  );

  const addQuickStarter = useCallback(() => {
    setConversationQuickStarters(
      produce(conversationQuickStarters, (draft) => {
        draft.push({
          title: '',
          example: '',
        });
      })
    );
  }, [conversationQuickStarters]);

  const updateQuickStarter = useCallback(
    (quickStart: ConversationQuickStarter, index: number) => {
      setConversationQuickStarters(
        produce(conversationQuickStarters, (draft) => {
          draft[index] = quickStart;
        })
      );
    },
    [conversationQuickStarters]
  );

  const removeQuickStarter = useCallback(
    (index: number) => {
      setConversationQuickStarters(
        produce(conversationQuickStarters, (draft) => {
          draft.splice(index, 1);
          if (draft.length === 0) {
            draft.push({
              title: '',
              example: '',
            });
          }
        })
      );
    },
    [conversationQuickStarters]
  );

  const onClickBack = useCallback(() => {
    history.back();
  }, []);

  const isValidGenerationConfigParam = useCallback(
    (value: number, key: 'maxTokens' | 'topK' | 'topP' | 'temperature') => {
      if (value < edgeGenerationParams[key].MIN) {
        setErrorMessages(
          key,
          t('validation.minRange.message', {
            size: edgeGenerationParams[key].MIN,
          })
        );
        return false;
      } else if (value > edgeGenerationParams[key].MAX) {
        setErrorMessages(
          key,
          t('validation.maxRange.message', {
            size: edgeGenerationParams[key].MAX,
          })
        );
        return false;
      }

      return true;
    },
    [setErrorMessages, t]
  );

  const isValid = useCallback((): boolean => {
    clearErrorMessages();
    if (embeddingParams.chunkSize > EDGE_EMBEDDING_PARAMS.chunkSize.MAX) {
      setErrorMessages(
        'chunkSize',
        t('validation.maxRange.message', {
          size: EDGE_EMBEDDING_PARAMS.chunkSize.MAX,
        })
      );
      return false;
    }

    if (embeddingParams.chunkOverlap > EDGE_EMBEDDING_PARAMS.chunkOverlap.MAX) {
      setErrorMessages(
        'chunkOverlap',
        t('validation.maxRange.message', {
          size: EDGE_EMBEDDING_PARAMS.chunkOverlap.MAX,
        })
      );
      return false;
    }

    if (embeddingParams.chunkSize < embeddingParams.chunkOverlap) {
      setErrorMessages(
        'chunkOverlap',
        t('validation.chunkOverlapLessThanChunkSize.message')
      );
      return false;
    }

    if (stopSequences.length === 0) {
      setErrorMessages('stopSequences', t('input.validationError.required'));
      return false;
    }

    if (searchParams.maxResults < EDGE_SEARCH_PARAMS.maxResults.MIN) {
      setErrorMessages(
        'maxResults',
        t('validation.minRange.message', {
          size: EDGE_SEARCH_PARAMS.maxResults.MIN,
        })
      );
      return false;
    } else if (searchParams.maxResults > EDGE_SEARCH_PARAMS.maxResults.MAX) {
      setErrorMessages(
        'maxResults',
        t('validation.maxRange.message', {
          size: EDGE_SEARCH_PARAMS.maxResults.MAX,
        })
      );
      return false;
    }

    const isQsValid = conversationQuickStarters.every((rs, idx) => {
      if ((!rs.title && !!rs.example) || (!!rs.title && !rs.example)) {
        setErrorMessages(
          `conversationQuickStarter${idx}`,
          t('validation.quickStarter.message')
        );
        return false;
      } else {
        return true;
      }
    });
    if (!isQsValid) {
      return false;
    }

    return (
      isValidGenerationConfigParam(maxTokens, 'maxTokens') &&
      isValidGenerationConfigParam(topK, 'topK') &&
      isValidGenerationConfigParam(topP, 'topP') &&
      isValidGenerationConfigParam(temperature, 'temperature')
    );
  }, [
    clearErrorMessages,
    embeddingParams.chunkSize,
    embeddingParams.chunkOverlap,
    stopSequences.length,
    searchParams.maxResults,
    conversationQuickStarters,
    isValidGenerationConfigParam,
    maxTokens,
    topK,
    topP,
    temperature,
    setErrorMessages,
    t,
  ]);

  const onClickDuplicate = useCallback(() => {
    if (!isValid()) {
      return;
    }
    setIsLoading(true);
    registerBot({
      agent: {
        tools: tools.map(({ name }) => name),
      },
      id: ulid(),
      title: `${title} Duplicate`,
      description,
      instruction,
      embeddingParams: {
        chunkSize: embeddingParams.chunkSize,
        chunkOverlap: embeddingParams.chunkOverlap,
        enablePartitionPdf: embeddingParams.enablePartitionPdf,
      },
      generationParams: {
        maxTokens,
        temperature,
        topK,
        topP,
        stopSequences: stopSequences.split(','),
      },
      searchParams,
      knowledge: {
        sourceUrls: urls.filter((s) => s !== ''),
        // Sitemap cannot be used yet.
        sitemapUrls: [],
        s3Urls: [],
        filenames: files.map((f) => f.filename),
      },
      displayRetrievedChunks,
      conversationQuickStarters: conversationQuickStarters.filter(
        (qs) => qs.title !== '' && qs.example !== ''
      ),
    })
      .then(() => {
        navigate('/bot/explore');
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [
    isValid,
    registerBot,
    tools,
    title,
    description,
    instruction,
    embeddingParams.chunkSize,
    embeddingParams.chunkOverlap,
    embeddingParams.enablePartitionPdf,
    maxTokens,
    temperature,
    topK,
    topP,
    stopSequences,
    searchParams,
    urls,
    files,
    displayRetrievedChunks,
    conversationQuickStarters,
    navigate,
  ]);

  const onClickCreate = useCallback(() => {
    if (!isValid()) {
      return;
    }
    setIsLoading(true);
    registerBot({
      agent: {
        tools: tools.map(({ name }) => name),
      },
      id: botId,
      title,
      description,
      instruction,
      embeddingParams: {
        chunkSize: embeddingParams.chunkSize,
        chunkOverlap: embeddingParams.chunkOverlap,
        enablePartitionPdf: embeddingParams.enablePartitionPdf,
      },
      generationParams: {
        maxTokens,
        temperature,
        topK,
        topP,
        stopSequences: stopSequences.split(','),
      },
      searchParams,
      knowledge: {
        sourceUrls: urls.filter((s) => s !== ''),
        // Sitemap cannot be used yet.
        sitemapUrls: [],
        s3Urls: [],
        filenames: files.map((f) => f.filename),
      },
      displayRetrievedChunks,
      conversationQuickStarters: conversationQuickStarters.filter(
        (qs) => qs.title !== '' && qs.example !== ''
      ),
    })
      .then(() => {
        navigate('/bot/explore');
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, [
    isValid,
    registerBot,
    tools,
    botId,
    title,
    description,
    instruction,
    embeddingParams.chunkSize,
    embeddingParams.chunkOverlap,
    embeddingParams.enablePartitionPdf,
    maxTokens,
    temperature,
    topK,
    topP,
    stopSequences,
    searchParams,
    urls,
    files,
    displayRetrievedChunks,
    conversationQuickStarters,
    navigate,
  ]);

  const onClickEdit = useCallback(() => {
    if (!isValid()) {
      return;
    }
    if (!isNewBot) {
      setIsLoading(true);
      updateBot(botId, {
        agent: {
          tools: tools.map(({ name }) => name),
        },
        title,
        description,
        instruction,
        embeddingParams: {
          chunkSize: embeddingParams?.chunkSize,
          chunkOverlap: embeddingParams?.chunkOverlap,
          enablePartitionPdf: embeddingParams?.enablePartitionPdf,
        },
        generationParams: {
          maxTokens,
          temperature,
          topK,
          topP,
          stopSequences: stopSequences.split(','),
        },
        searchParams,
        knowledge: {
          sourceUrls: urls.filter((s) => s !== ''),
          // Sitemap cannot be used yet.
          sitemapUrls: [],
          s3Urls: [],
          addedFilenames,
          deletedFilenames,
          unchangedFilenames,
        },
        displayRetrievedChunks,
        conversationQuickStarters: conversationQuickStarters.filter(
          (qs) => qs.title !== '' && qs.example !== ''
        ),
      })
        .then(() => {
          navigate('/bot/explore');
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [
    isValid,
    isNewBot,
    updateBot,
    botId,
    tools,
    title,
    description,
    instruction,
    embeddingParams?.chunkSize,
    embeddingParams?.chunkOverlap,
    embeddingParams?.enablePartitionPdf,
    maxTokens,
    temperature,
    topK,
    topP,
    stopSequences,
    searchParams,
    urls,
    addedFilenames,
    deletedFilenames,
    unchangedFilenames,
    displayRetrievedChunks,
    conversationQuickStarters,
    navigate,
  ]);

  const [isOpenSamples, setIsOpenSamples] = useState(false);

  const disabledRegister = useMemo(() => {
    return title === '' || files.findIndex((f) => f.status !== 'UPLOADED') > -1;
  }, [files, title]);

  return (
    <>
      <DialogInstructionsSamples
        isOpen={isOpenSamples}
        onClose={() => {
          setIsOpenSamples(false);
        }}
      />
      <div className="mb-20 flex justify-center">
        <div className="w-2/3">
          <div className="mt-5 w-full">
            <div className="text-xl font-bold">
              {isNewBot ? t('bot.create.pageTitle') : t('bot.edit.pageTitle')}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <InputText
                label={t('bot.item.title')}
                disabled={isLoading}
                value={title}
                onChange={setTitle}
                hint={t('input.hint.required')}
              />
              <InputText
                label={t('bot.item.description')}
                disabled={isLoading}
                value={description}
                onChange={setDescription}
              />
              <div className="relative mt-3">
                <Button
                  className="absolute -top-3 right-0 text-xs"
                  outlined
                  onClick={() => {
                    setIsOpenSamples(true);
                  }}>
                  <PiNote className="mr-1" />
                  {t('bot.button.instructionsSamples')}
                </Button>
                <Textarea
                  label={t('bot.item.instruction')}
                  disabled={isLoading}
                  rows={5}
                  hint={t('bot.help.instructions')}
                  value={instruction}
                  onChange={setInstruction}
                />
              </div>

              <div className="mt-3" />
              <AvailableTools
                availableTools={availableTools}
                tools={tools}
                setTools={setTools}
              />

              <div className="mt-3">
                <div className="flex items-center gap-1">
                  <div className="text-lg font-bold">
                    {t('bot.label.knowledge')}
                  </div>
                </div>

                <div className="text-sm text-aws-font-color/50">
                  {t('bot.help.knowledge.overview')}
                </div>

                {errorMessages['syncError'] && (
                  <Alert
                    className="mt-2"
                    severity="error"
                    title={t('bot.alert.sync.error.title')}>
                    <>
                      <div className="mb-1 text-sm">
                        <div>{t('bot.alert.sync.error.body')}</div>
                        <div> {errorMessages['syncError']}</div>
                      </div>
                    </>
                  </Alert>
                )}

                <div className="mt-2">
                  <div className="font-semibold">{t('bot.label.url')}</div>
                  <div className="text-sm text-aws-font-color/50">
                    {t('bot.help.knowledge.url')}
                  </div>
                  <div className="mt-2 flex w-full flex-col gap-1">
                    {urls.map((url, idx) => (
                      <div className="flex w-full gap-2" key={idx}>
                        <InputText
                          className="w-full"
                          type="url"
                          disabled={isLoading}
                          value={url}
                          onChange={(s) => {
                            onChangeUrl(s, idx);
                          }}
                        />
                        <ButtonIcon
                          className="text-red"
                          disabled={
                            (urls.length === 1 && !urls[0]) || isLoading
                          }
                          onClick={() => {
                            onClickRemoveUrl(idx);
                          }}>
                          <PiTrash />
                        </ButtonIcon>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2" style={{ display: "flex", flexDirection: "row", gap: "0.5rem" }}>
                    <Button outlined icon={<PiPlus />} onClick={onClickAddUrl}>
                      {t('button.add')}
                    </Button>
                    <Button outlined icon={<PiPlus />} onClick={onClickAddUrlArray}>
                      Add Array
                    </Button>
                    <Button outlined icon={<PiPlus />} onClick={onClickAddUrlArrayFromFile}>
                      Add Array From File
                    </Button><Button outlined icon={<PiTrash />} onClick={onClickClearUrls}>
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="font-semibold">{t('bot.label.file')}</div>
                  <div className="text-sm text-aws-font-color/50">
                    {t('bot.help.knowledge.file')}
                  </div>
                  <div className="mt-2 flex w-full flex-col gap-1">
                    <KnowledgeFileUploader
                      className="h-48"
                      botId={botId}
                      files={files}
                      onAdd={onAddFiles}
                      onUpdate={onUpdateFiles}
                      onDelete={onDeleteFiles}
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <div className="font-semibold">
                    {t('bot.label.citeRetrievedContexts')}
                  </div>
                  <div className="flex">
                    <Toggle
                      value={displayRetrievedChunks}
                      onChange={setDisplayRetrievedChunks}
                    />
                    <div className="whitespace-pre-wrap text-sm text-aws-font-color/50">
                      {t('bot.help.knowledge.citeRetrievedContexts')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-1">
                  <div className="text-lg font-bold">
                    {t('bot.label.quickStarter.title')}
                  </div>
                </div>

                <div className="text-sm text-aws-font-color/50">
                  {t('bot.help.quickStarter.overview')}
                </div>

                <div className="mt-2">
                  <div className="mt-2 flex w-full flex-col gap-1">
                    {conversationQuickStarters.map(
                      (conversationQuickStarter, idx) => (
                        <div
                          className="flex w-full flex-col gap-2 rounded border border-aws-font-color/50 p-2"
                          key={idx}>
                          <InputText
                            className="w-full"
                            placeholder={t(
                              'bot.label.quickStarter.exampleTitle'
                            )}
                            disabled={isLoading}
                            value={conversationQuickStarter.title}
                            onChange={(s) => {
                              updateQuickStarter(
                                {
                                  ...conversationQuickStarter,
                                  title: s,
                                },
                                idx
                              );
                            }}
                            errorMessage={
                              errorMessages[`conversationQuickStarter${idx}`]
                            }
                          />

                          <Textarea
                            className="w-full"
                            label={t('bot.label.quickStarter.example')}
                            disabled={isLoading}
                            rows={3}
                            value={conversationQuickStarter.example}
                            onChange={(s) => {
                              updateQuickStarter(
                                {
                                  ...conversationQuickStarter,
                                  example: s,
                                },
                                idx
                              );
                            }}
                          />
                          <div className="flex justify-end">
                            <Button
                              className="bg-red"
                              disabled={
                                (conversationQuickStarters.length === 1 &&
                                  !conversationQuickStarters[0].title &&
                                  !conversationQuickStarters[0].example) ||
                                isLoading
                              }
                              icon={<PiTrash />}
                              onClick={() => {
                                removeQuickStarter(idx);
                              }}>
                              {t('button.delete')}
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                  <div className="mt-2">
                    <Button
                      outlined
                      icon={<PiPlus />}
                      onClick={addQuickStarter}>
                      {t('button.add')}
                    </Button>
                  </div>
                </div>
              </div>

              <ExpandableDrawerGroup
                isDefaultShow={false}
                label={t('generationConfig.title')}
                className="py-2">
                <GenerationConfig
                  topK={topK}
                  setTopK={setTopK}
                  topP={topP}
                  setTopP={setTopP}
                  temperature={temperature}
                  setTemperature={setTemperature}
                  maxTokens={maxTokens}
                  setMaxTokens={setMaxTokens}
                  stopSequences={stopSequences}
                  setStopSequences={setStopSequences}
                  isLoading={isLoading}
                  errorMessages={errorMessages}
                />
              </ExpandableDrawerGroup>

              <ExpandableDrawerGroup
                isDefaultShow={false}
                label={t('embeddingSettings.title')}
                className="py-2">
                <div className="text-sm text-aws-font-color/50">
                  {t('embeddingSettings.description')}
                </div>
                <div className="mt-2">
                  <Slider
                    value={embeddingParams?.chunkSize}
                    hint={t('embeddingSettings.chunkSize.hint')}
                    label={
                      <div className="flex items-center gap-1">
                        {t('embeddingSettings.chunkSize.label')}
                        <Help
                          direction={TooltipDirection.RIGHT}
                          message={t('embeddingSettings.help.chunkSize')}
                        />
                      </div>
                    }
                    range={{
                      min: EDGE_EMBEDDING_PARAMS.chunkSize.MIN,
                      max: EDGE_EMBEDDING_PARAMS.chunkSize.MAX,
                      step: EDGE_EMBEDDING_PARAMS.chunkSize.STEP,
                    }}
                    onChange={(chunkSize) =>
                      setEmbeddingParams((params) => ({
                        ...params,
                        chunkSize: chunkSize,
                      }))
                    }
                    errorMessage={errorMessages['chunkSize']}
                  />
                </div>
                <div className="mt-2">
                  <Slider
                    value={embeddingParams?.chunkOverlap}
                    hint={t('embeddingSettings.chunkOverlap.hint')}
                    label={
                      <div className="flex items-center gap-1">
                        {t('embeddingSettings.chunkOverlap.label')}
                        <Help
                          direction={TooltipDirection.RIGHT}
                          message={t('embeddingSettings.help.chunkOverlap')}
                        />
                      </div>
                    }
                    range={{
                      min: EDGE_EMBEDDING_PARAMS.chunkOverlap.MIN,
                      max: EDGE_EMBEDDING_PARAMS.chunkOverlap.MAX,
                      step: EDGE_EMBEDDING_PARAMS.chunkOverlap.STEP,
                    }}
                    onChange={(chunkOverlap) =>
                      setEmbeddingParams((params) => ({
                        ...params,
                        chunkOverlap: chunkOverlap,
                      }))
                    }
                    errorMessage={errorMessages['chunkOverlap']}
                  />
                </div>
                <div className="mt-2">
                  <Toggle
                    value={embeddingParams?.enablePartitionPdf ?? false}
                    label={t('embeddingSettings.enablePartitionPdf.label')}
                    hint={t('embeddingSettings.enablePartitionPdf.hint')}
                    onChange={(enablePartitionPdf) =>
                      setEmbeddingParams((params) => ({
                        ...params,
                        enablePartitionPdf: enablePartitionPdf,
                      }))
                    }
                  />
                </div>
              </ExpandableDrawerGroup>

              <ExpandableDrawerGroup
                isDefaultShow={false}
                label={t('searchSettings.title')}
                className="py-2">
                <div className="text-sm text-aws-font-color/50">
                  {t('searchSettings.description')}
                </div>
                <div className="mt-2">
                  <Slider
                    value={searchParams.maxResults}
                    hint={t('searchSettings.maxResults.hint')}
                    label={t('searchSettings.maxResults.label')}
                    range={{
                      min: EDGE_SEARCH_PARAMS.maxResults.MIN,
                      max: EDGE_SEARCH_PARAMS.maxResults.MAX,
                      step: EDGE_SEARCH_PARAMS.maxResults.STEP,
                    }}
                    onChange={(maxResults) =>
                      setSearchParams((params) => ({
                        ...params,
                        maxResults,
                      }))
                    }
                    errorMessage={errorMessages['maxResults']}
                  />
                </div>
              </ExpandableDrawerGroup>

              {errorMessages['syncChunkError'] && (
                <Alert
                  className="mt-2"
                  severity="error"
                  title={t('embeddingSettings.alert.sync.error.title')}>
                  <>
                    <div className="mb-1 text-sm">
                      {t('embeddingSettings.alert.sync.error.body')}
                    </div>
                  </>
                </Alert>
              )}

              <div className="flex justify-between">
                <Button outlined icon={<PiCaretLeft />} onClick={onClickBack}>
                  {t('button.back')}
                </Button>

                {isNewBot ? (
                  <Button
                    onClick={onClickCreate}
                    loading={isLoading}
                    disabled={disabledRegister}>
                    {t('bot.button.create')}
                  </Button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "row" }}>
                    <Button
                      onClick={onClickDuplicate}
                      loading={isLoading}
                      disabled={disabledRegister}>
                      Duplicate
                    </Button>
                    <Button
                      onClick={onClickEdit}
                      loading={isLoading}
                      disabled={disabledRegister}>
                      {t('bot.button.edit')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BotEditPage;
