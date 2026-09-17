export function getDashboardIcon(): string {
	return `
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 64 64"
			width="100%"
			height="100%"
		>
			<defs>
				<linearGradient id="dynamicDashboardCrystalMain" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="#C084FC"/>
					<stop offset="50%" stop-color="#8B5CF6"/>
					<stop offset="100%" stop-color="#6D28D9"/>
				</linearGradient>
				<linearGradient id="dynamicDashboardCrystalDark" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="#7C3AED"/>
					<stop offset="100%" stop-color="#4C1D95"/>
				</linearGradient>
				<linearGradient id="dynamicDashboardCrystalLight" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="#E9D5FF"/>
					<stop offset="100%" stop-color="#A855F7"/>
				</linearGradient>
				<linearGradient id="dynamicDashboardBarGradient" x1="0" y1="1" x2="0" y2="0">
					<stop offset="0%" stop-color="#8B5CF6"/>
					<stop offset="100%" stop-color="#DDD6FE"/>
				</linearGradient>
			</defs>
			<path d="M22 5 L35 18 L31 43 L20 57 L8 47 L5 27 L14 13 Z" fill="url(#dynamicDashboardCrystalMain)"/>
			<path d="M22 5 L14 13 L5 27 L18 23 Z" fill="#A855F7"/>
			<path d="M22 5 L18 23 L27 30 L35 18 Z" fill="url(#dynamicDashboardCrystalLight)"/>
			<path d="M5 27 L18 23 L17 45 L8 47 Z" fill="#7C3AED"/>
			<path d="M18 23 L27 30 L31 43 L20 57 L17 45 Z" fill="url(#dynamicDashboardCrystalDark)"/>
			<path d="M27 30 L35 18 L31 43 Z" fill="#9333EA"/>
			<rect x="38" y="39" width="6" height="16" rx="2" fill="url(#dynamicDashboardBarGradient)"/>
			<rect x="47" y="29" width="6" height="26" rx="2" fill="url(#dynamicDashboardBarGradient)"/>
			<rect x="56" y="17" width="6" height="38" rx="2" fill="url(#dynamicDashboardBarGradient)"/>
		</svg>
	`.trim();
}
