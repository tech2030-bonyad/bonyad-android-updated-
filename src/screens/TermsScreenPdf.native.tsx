/**
 * Native-only: provides Pdf component from react-native-pdf.
 * Used by TermsScreen on Android/iOS (not web).
 */
let Pdf: any;
try {
  Pdf = require('react-native-pdf').default;
} catch (e) {
  console.warn('react-native-pdf could not be loaded', e);
}

export default Pdf;
