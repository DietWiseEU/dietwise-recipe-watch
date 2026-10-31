import { useEffect, useState } from 'react';
import { useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

// The device has a single screen-on flag, while several consumers may want it on at the same time.
// Counting their holds lets the screen sleep only when the last one lets go.
let holds = 0;

// Holds the device screen awake while `active` is true and the hosting Ionic view is in the
// foreground, releasing the hold as soon as either stops being true. The screen-on flag only takes
// effect on Android/iOS; on the web build this is a no-op so the toggle can still be demoed.
export function useKeepScreenAwake(active: boolean): void {
	const [viewVisible, setViewVisible] = useState(true);
	useIonViewWillEnter(() => setViewVisible(true));
	useIonViewWillLeave(() => setViewVisible(false));

	useEffect(() => {
		if (!Capacitor.isNativePlatform() || !active || !viewVisible) {
			return;
		}
		holds += 1;
		if (holds === 1) {
			KeepAwake.keepAwake();
		}
		return () => {
			holds -= 1;
			if (holds === 0) {
				KeepAwake.allowSleep();
			}
		};
	}, [active, viewVisible]);
}
