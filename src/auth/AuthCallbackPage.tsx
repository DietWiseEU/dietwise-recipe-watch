import { useRef, RefObject } from 'react';
import { useIonViewDidEnter, useIonViewWillLeave, IonPage } from '@ionic/react';
import { RouteComponentProps } from 'react-router';
import { authService } from '@/auth/authService';
import { filter, from, Subscription, switchMap, take, throwError } from 'rxjs';
import { AuthActions } from 'ionic-appauth';
import { consumeMobilePreviewReturnPath } from '@/auth/mobilePreviewAuth';
import { LOG_SENSITIVE_DATA } from '@/common/logging';

const AuthCallbackPage: React.FC<RouteComponentProps> = (props: RouteComponentProps) => {
	const unsubscribeRef: RefObject<Subscription | null> = useRef(null);

	const leaveCallbackPage = () => {
		const mobilePreviewReturnPath = consumeMobilePreviewReturnPath();
		if (mobilePreviewReturnPath) {
			window.location.replace(mobilePreviewReturnPath);
			return;
		}
		props.history.replace('/Home');
	};

	useIonViewDidEnter(() => {
		const callbackUrl = window.location.href;
		authService.authorizationCallback(callbackUrl);
		unsubscribeRef.current = authService.events$
			.pipe(
				filter(
					(action) =>
						action.action === AuthActions.SignInSuccess || action.action === AuthActions.SignInFailed,
				),
				take(1),
				switchMap((action) => {
					if (action.action === AuthActions.SignInSuccess) {
						return from(authService.loadUserInfo());
					} else {
						return throwError(() => action.error);
					}
				}),
			)
			.subscribe({
				next() {
					leaveCallbackPage();
				},
				error(err) {
					if (LOG_SENSITIVE_DATA) {
						console.error('Sign in failed', err);
					}
					leaveCallbackPage();
				},
			});
	});

	useIonViewWillLeave(() => unsubscribeRef.current?.unsubscribe());

	return (
		<IonPage>
			<p>Signing in...</p>
		</IonPage>
	);
};

export default AuthCallbackPage;
