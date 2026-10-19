// Hermes cannot compile destructured rest parameters emitted by dependencies such as oRPC.
module.exports = (api) => {
	api.cache(true);
	return {
		presets: ["babel-preset-expo"],
		plugins: ["@babel/plugin-transform-parameters", "@lingui/babel-plugin-lingui-macro"],
	};
};
