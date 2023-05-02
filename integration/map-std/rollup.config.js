import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";

export default [{
  input: 'src/map_std.ts',
  output: {
    file: 'dist/map_std.js',
    format: 'iife'
  },
  plugins: [typescript({ target: 'es2022' })]
},
{
  input: "dist/types/map_std.d.ts",
  output: [{ file: "dist/map_std.d.ts", format: "es" }],
  plugins: [dts.default()],
}];