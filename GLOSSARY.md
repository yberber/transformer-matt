# Inside the Transformer

A website that shows curious non-experts how GPT-2 small turns a piece of text into a continuation, step by step, with real numbers.

## Running the model

**Prompt**:
The text the model is asked to continue, either from an Example or typed by the user.
_Avoid_: input, question, query

**Continuation**:
The tokens generated greedily after the Prompt.
_Avoid_: answer, response, completion, output

**Step**:
The generation of one more Continuation token. Step 0 is the Prompt alone.
_Avoid_: iteration, turn

**Position**:
The index of a token in the sequence (Prompt followed by Continuation). A token's color belongs to its Position, not to its token ID.
_Avoid_: slot, index

**Trace**:
Every recorded value for a Prompt and its Steps.
_Avoid_: run data, result, dump

## Run modes

**Example**:
A built-in Prompt shipped with its precomputed Trace.
_Avoid_: sample, demo, preset

**Example mode**:
The default run mode, where every value comes from an Example's precomputed Trace.
_Avoid_: offline mode, demo mode

**Live mode**:
The opt-in run mode, where the user's own Prompt is run by the inference server.
_Avoid_: online mode, custom mode

## Statistics

**Estimate**:
A computed theoretical cost figure, such as FLOPs or memory, as opposed to a measured value.
_Avoid_: measurement, benchmark
