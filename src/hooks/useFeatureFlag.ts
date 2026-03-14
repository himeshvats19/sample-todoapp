import React from 'react';

function useFeatureFlag(flagKey: string) {
  const [enabled, setEnabled] = React.useState(!!window.FeatureStudio?.flags?.[flagKey]);
  React.useEffect(() => {
    const handleFlags = () => setEnabled(!!window.FeatureStudio?.flags?.[flagKey]);
    window.addEventListener('feature-studio-flags-loaded', handleFlags);
    handleFlags();
    return () => window.removeEventListener('feature-studio-flags-loaded', handleFlags);
  }, [flagKey]);
  return enabled;
}

export default useFeatureFlag;