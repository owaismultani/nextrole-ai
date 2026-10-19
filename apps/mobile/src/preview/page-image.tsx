import type { ImageProps } from "expo-image";
import { Image } from "expo-image";
import { useState } from "react";

type PageImageProps = Omit<ImageProps, "source"> & { uri: string };

/** Keep the displayed raster as the placeholder until its sharper replacement is decoded. */
export function PageImage({ uri, ...props }: PageImageProps) {
	const [displayed, setDisplayed] = useState(uri);
	return (
		<Image
			{...props}
			source={{ uri }}
			placeholder={{ uri: displayed }}
			placeholderContentFit="fill"
			contentFit="fill"
			cachePolicy="memory"
			transition={0}
			onDisplay={() => setDisplayed(uri)}
		/>
	);
}
