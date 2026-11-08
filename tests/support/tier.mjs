// External resources are opt-in, never discovered and rendered accidentally by quick CI.
export const realAcceptance=process.env.SONGYU_TEST_TIER==='acceptance'&&process.env.SONGYU_REAL_TESTS!=='0';
