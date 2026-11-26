import { useCallback, useState } from 'react';
import {
	IonButton,
	IonButtons,
	IonContent,
	IonHeader,
	IonIcon,
	IonItem,
	IonList,
	IonModal,
	IonSelect,
	IonSelectOption,
	IonTextarea,
	IonTitle,
	IonToolbar,
} from '@ionic/react';
import type { SelectChangeEventDetail } from '@ionic/core';
import { close } from 'ionicons/icons';
import { useTranslation } from 'react-i18next';
import './UrlModal.css';

export interface UrlModalProps {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
	url: string | undefined;
	language: string;
	setData: (url: string, lang: string) => void;
}

const UrlModal: React.FC<UrlModalProps> = (props) => {
	const { t } = useTranslation();

	const [url, setUrl] = useState<string | null | undefined>(props.url);
	const [language, setLanguage] = useState<string>(props.language);

	const onChangeLanguageCallback = useCallback((e: CustomEvent<SelectChangeEventDetail<string>>) => {
		setLanguage(e.detail.value);
	}, []);

	const assessCallback = useCallback(() => {
		let localUrl = url;
		if (localUrl && typeof localUrl === 'string') localUrl = localUrl.trim();
		if (localUrl && (localUrl !== props.url || language !== props.language)) {
			props.setData('' + localUrl, language);
			props.setIsOpen(false);
		}
	}, [props, url, language]);

	return (
		<IonModal isOpen={props.isOpen} onDidDismiss={() => props.setIsOpen(false)}>
			<IonHeader>
				<IonToolbar>
					<IonButtons slot="start">
						<IonButton onClick={() => props.setIsOpen(false)}>{t('general.CANCEL')}</IonButton>
					</IonButtons>
					<IonTitle>{t('recipe.enterUrlModalTitle')}</IonTitle>
					<IonButtons slot="end">
						<IonButton onClick={() => assessCallback()}>{t('recipe.ASSESS')}</IonButton>
					</IonButtons>
				</IonToolbar>
			</IonHeader>
			<IonContent className="ion-padding">
				<IonList>
					<IonItem>
						<IonTextarea
							autoGrow
							label={t('recipe.urlPlaceholder')}
							labelPlacement="stacked"
							value={url}
							onIonInput={(e) => setUrl(e.target.value)}
						>
							<IonButton
								className="url-modal__clear"
								fill="clear"
								slot="end"
								aria-label={t('general.clear')}
								onClick={() => setUrl(null)}
							>
								<IonIcon slot="icon-only" icon={close} aria-hidden="true"></IonIcon>
							</IonButton>
						</IonTextarea>
					</IonItem>
					<IonItem>
						<IonSelect
							label={t('recipe.language')}
							cancelText={t('general.CANCEL')}
							okText={t('general.OK')}
							onIonChange={onChangeLanguageCallback}
							value={language}
						>
							<IonSelectOption value="en">{t('languages.en')}</IonSelectOption>
							<IonSelectOption value="el">{t('languages.el')}</IonSelectOption>
							<IonSelectOption value="lt">{t('languages.lt')}</IonSelectOption>
							<IonSelectOption value="nl">{t('languages.nl')}</IonSelectOption>
						</IonSelect>
					</IonItem>
				</IonList>
			</IonContent>
		</IonModal>
	);
};

export default UrlModal;
