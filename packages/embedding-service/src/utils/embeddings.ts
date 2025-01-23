import {
  CLIPVisionModelWithProjection,
  PreTrainedModel,
  PreTrainedTokenizer,
  Processor,
  RawImage,
} from "@huggingface/transformers";

export async function getTextEmbeddings(
  text: string,
  textModel: PreTrainedModel,
  tokenizer: PreTrainedTokenizer
) {
  const textFeatures = tokenizer(text, {
    padding: "max_length", // Pad to the maximum sequence length
    truncation: true, // Truncate longer sequences
    return_tensors: "pt", // Return PyTorch-like tensors
  });

  const { text_embeds } = await textModel.forward({
    input_ids: textFeatures.input_ids,
    attention_mask: textFeatures.attention_mask,
  });

  return Array.from(text_embeds.ort_tensor.cpuData);
}

export async function getImageEmbeddings(
  url: string,
  imageModel: CLIPVisionModelWithProjection,
  processor: Processor
) {
  const image = await RawImage.fromURL(url);

  const imageInputs = await processor(image);

  const { image_embeds } = await imageModel(imageInputs);

  return image_embeds;
}
