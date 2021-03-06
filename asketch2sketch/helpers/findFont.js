// taken from https://github.com/airbnb/react-sketchapp/blob/master/src/utils/findFont.js
import hashStyle from './hashStyle';

// Font displayed if San Francisco fonts are not found
const APPLE_BROKEN_SYSTEM_FONT = '.AppleSystemUIFont';

// this borrows heavily from react-native's RCTFont class
// thanks y'all
// https://github.com/facebook/react-native/blob/master/React/Views/RCTFont.mm

const FONT_STYLES = {
  normal: false,
  italic: true,
  oblique: true,
};

const FONT_WEIGHTS = {
  normal: NSFontWeightRegular,
  bold: NSFontWeightBold,
  '100': NSFontWeightUltraLight,
  '200': NSFontWeightThin,
  '300': NSFontWeightLight,
  '400': NSFontWeightRegular,
  '500': NSFontWeightMedium,
  '600': NSFontWeightSemibold,
  '700': NSFontWeightBold,
  '800': NSFontWeightHeavy,
  '900': NSFontWeightBlack,
};

const WEIGHT_MAP = {
  [NSFontWeightUltraLight]: [-1.0, -0.70],
  [NSFontWeightThin]: [-0.70, -0.45],
  [NSFontWeightLight]: [-0.45, -0.10],
  [NSFontWeightRegular]: [-0.10, 0.10],
  [NSFontWeightMedium]: [0.10, 0.27],
  [NSFontWeightSemibold]: [0.27, 0.35],
  [NSFontWeightBold]: [0.35, 0.50],
  [NSFontWeightHeavy]: [0.50, 0.60],
  [NSFontWeightBlack]: [0.60, 1.0],
};

const isItalicFont = font => {
  const traits = font.fontDescriptor().objectForKey(NSFontTraitsAttribute);
  const symbolicTraits = traits[NSFontSymbolicTrait].unsignedIntValue();

  return (symbolicTraits & NSFontItalicTrait) !== 0;
};

const isCondensedFont = font => {
  const traits = font.fontDescriptor().objectForKey(NSFontTraitsAttribute);
  const symbolicTraits = traits[NSFontSymbolicTrait].unsignedIntValue();

  return (symbolicTraits & NSFontCondensedTrait) !== 0;
};

const weightOfFont = font => {
  const traits = font.fontDescriptor().objectForKey(NSFontTraitsAttribute);

  const weight = traits[NSFontWeightTrait].doubleValue();

  if (weight === 0.0) {
    const weights = Object.keys(FONT_WEIGHTS);

    for (let i = 0; i < weights.length; i += 1) {
      const w = weights[i];

      if (
        font
          .fontName()
          .toLowerCase()
          .endsWith(w)
      ) {
        return FONT_WEIGHTS[w];
      }
    }
  }

  return weight;
};

const fontNamesForFamilyName = familyName => {
  const manager = NSFontManager.sharedFontManager();
  const members = NSArray.arrayWithArray(manager.availableMembersOfFontFamily(familyName));

  const results = [];

  for (let i = 0; i < members.length; i += 1) {
    results.push(members[i][0]);
  }

  return results;
};

const useCache = true;
const _cache = new Map();

const getCached = key => {
  if (!useCache) {return undefined;}
  return _cache.get(key);
};

const findFont = style => {
  const cacheKey = hashStyle(style);

  let font = getCached(cacheKey);

  if (font) {
    return font;
  }
  const defaultFontFamily = NSFont.systemFontOfSize(14).familyName();
  const defaultFontWeight = NSFontWeightRegular;
  const defaultFontSize = 14;

  const fontSize = style.fontSize ? style.fontSize : defaultFontSize;
  let fontWeight = style.fontWeight ? FONT_WEIGHTS[style.fontWeight] : defaultFontWeight;
  // Default to Helvetica if fonts are missing
  let familyName =
    // Must use two equals (==) for compatibility with Cocoascript
    // eslint-disable-next-line eqeqeq
    defaultFontFamily == APPLE_BROKEN_SYSTEM_FONT ? 'Helvetica' : defaultFontFamily;
  let isItalic = false;
  let isCondensed = false;

  if (style.fontFamily) {
    familyName = style.fontFamily;
  }

  if (style.fontStyle) {
    isItalic = FONT_STYLES[style.fontStyle] || false;
  }

  let didFindFont = false;

  // Handle system font as special case. This ensures that we preserve
  // the specific metrics of the standard system font as closely as possible.
  if (familyName === defaultFontFamily || familyName === 'System') {
    font = NSFont.systemFontOfSize_weight(fontSize, fontWeight);

    if (font) {
      didFindFont = true;

      if (isItalic || isCondensed) {
        let fontDescriptor = font.fontDescriptor();
        let symbolicTraits = fontDescriptor.symbolicTraits();

        if (isItalic) {
          symbolicTraits |= NSFontItalicTrait;
        }

        if (isCondensed) {
          symbolicTraits |= NSFontCondensedTrait;
        }

        fontDescriptor = fontDescriptor.fontDescriptorWithSymbolicTraits(symbolicTraits);
        font = NSFont.fontWithDescriptor_size(fontDescriptor, fontSize);
      }
    }
  }

  const fontNames = fontNamesForFamilyName(familyName);

  // Gracefully handle being given a font name rather than font family, for
  // example: "Helvetica Light Oblique" rather than just "Helvetica".
  if (!didFindFont && fontNames.length === 0) {
    font = NSFont.fontWithName_size(familyName, fontSize);
    if (font) {
      // It's actually a font name, not a font family name,
      // but we'll do what was meant, not what was said.
      familyName = font.familyName();
      fontWeight = style.fontWeight ? fontWeight : weightOfFont(font);
      isItalic = style.fontStyle ? isItalic : isItalicFont(font);
      isCondensed = isCondensedFont(font);
    } else {
      console.log(`Unrecognized font family '${familyName}'`);
      font = NSFont.systemFontOfSize_weight(fontSize, fontWeight);
    }
  }

  // Get the font that matches the given weight for the fontFamily.
  // We don't break the loop even if we find matching element because
  // the heaviest matching element should win.
  // E.g. If weight of extra bold font found in the system is 0.61 and would match NSFontWeightBlack
  // and there is another heavier font - black, with 0.8 weight, the latter will be picked.
  const fontWeightRange = WEIGHT_MAP[fontWeight];

  for (let i = 0; i < fontNames.length; i += 1) {
    const match = NSFont.fontWithName_size(fontNames[i], fontSize);

    if (isItalic === isItalicFont(match) && isCondensed === isCondensedFont(match)) {
      const testWeight = weightOfFont(match);

      if (testWeight >= fontWeightRange[0] && testWeight < fontWeightRange[1]) {
        font = match;
      }
    }
  }

  // If we still don't have a match at least return the first font in the fontFamily
  // This is to support built-in font Zapfino and other custom single font families like Impact
  if (!font) {
    if (fontNames.length > 0) {
      font = NSFont.fontWithName_size(fontNames[0], fontSize);
    }
  }

  // TODO(gold): support opentype features: small-caps & number types

  if (font) {
    _cache.set(cacheKey, font);
  }

  return font;
};

export default findFont;
