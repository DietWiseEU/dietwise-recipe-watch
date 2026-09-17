import { useIonViewDidEnter, IonPage } from '@ionic/react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/auth/authService';
import { consumeMobilePreviewReturnPath } from '@/auth/mobilePreviewAuth';

const EndSessionPage: React.FC = () => {
	const navigate = useNavigate();

	useIonViewDidEnter(() => {
		authService.endSessionCallback();
		const mobilePreviewReturnPath = consumeMobilePreviewReturnPath();
		if (mobilePreviewReturnPath) {
			window.location.replace(mobilePreviewReturnPath);
			return;
		}
		navigate('/Home', { replace: true });
	});

	return (
		<IonPage>
			<p>Signing out...</p>
		</IonPage>
	);
};

export default EndSessionPage;
