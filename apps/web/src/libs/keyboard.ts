import type { KeyboardEvent } from "react";

/**
 * True while an IME (Japanese, Chinese, Korean input) is composing. The Enter that confirms a conversion must not also
 * submit. Safari reports that Enter after `compositionend` with `isComposing` false but `keyCode` 229.
 */
export const isImeComposing = (event: KeyboardEvent) => event.nativeEvent.isComposing || event.keyCode === 229;
