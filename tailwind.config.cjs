/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			container: {
				screens: {
					sm: '600px',
					md: '728px',
					lg: '984px',
					xl: '1240px',
				},
			}
		},
		screens: {
			xl: { max: "1279px" },
			lg: { max: "1023px" },
			md: { max: "767px" },
			sm: { max: "639px" },
		},
	},
	daisyui: {
		themes: [
			{
				ictsc: {
					primary: "#E6003A",
					// "primary-focus": "#f43f5e",
					"primary-content": "#FFFFFF",
					accent: "#37CDBE",
					"neutral": "#3D4451",
					"base-100": "#FFFFFF",
					info: "#3ABFF8",
					success: "#36D399",
					warning: "#FBBD23",
					error: "#F87272",
				},
			},
		],
	},
	plugins: [require("daisyui")],
}
