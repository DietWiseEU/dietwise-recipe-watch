import { useCallback } from 'react';
import { IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle } from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { addIcons } from 'ionicons';
import {
	homeOutline,
	homeSharp,
	idCardOutline,
	idCardSharp,
	logInOutline,
	logInSharp,
	logOutOutline,
	logOutSharp,
	settingsOutline,
	settingsSharp,
} from 'ionicons/icons';
import type { Location } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/auth/atoms';
import { authService } from '@/auth/authService';
import dietWiseIconOrange from '@/assets/images/DietWise_icon_Orange.svg';
import chefHatIcon from '@/assets/images/chef-hat.svg';
import chefHatFillIcon from '@/assets/images/chef-hat-fill.svg';
import './Menu.css';

addIcons({
	logo: dietWiseIconOrange,
	chefoutline: chefHatIcon,
	chefsharp: chefHatFillIcon,
});

interface AppMenuItemProps {
	titleKey: string;
	url: string;
	iosIcon: string;
	mdIcon: string;
	location: Location<unknown>;
	disabled?: boolean;
}

const AppMenuItem: React.FC<AppMenuItemProps> = ({ titleKey, url, iosIcon, mdIcon, location, disabled }) => {
	const { t } = useTranslation();

	return (
		<IonMenuToggle autoHide={false}>
			<IonItem
				className={location.pathname === url ? 'selected' : ''}
				routerLink={url}
				routerDirection="none"
				lines="none"
				detail={false}
				disabled={disabled}
			>
				<IonIcon aria-hidden="true" slot="start" ios={iosIcon} md={mdIcon} />
				<IonLabel>{t([`menu.${titleKey}`, `${titleKey}.title`])}</IonLabel>
			</IonItem>
		</IonMenuToggle>
	);
};

const Menu: React.FC = () => {
	const location = useLocation();
	const user = useAtomValue(userAtom);
	const signIn = useCallback(() => authService.signIn(), []);
	const signOut = useCallback(() => authService.signOut(), []);
	const { t } = useTranslation();

	return (
		<IonMenu contentId="main" type="overlay">
			<IonContent>
				<IonList id="inbox-list">
					<IonListHeader>
						<IonIcon icon="logo" aria-hidden="true" />
						<IonLabel>
							<h1>Recipe Watch</h1>
							<p className="ion-text-nowrap">{user ? user.email : t('menu.anonymous')}</p>
						</IonLabel>
					</IonListHeader>
					{/*}
					<IonListHeader>
						<IonIcon icon="logo" aria-hidden="true" />
						Recipe Watch
					</IonListHeader>
					<IonNote>{user ? user.email : t('menu.anonymous')}</IonNote>
					*/}
					<AppMenuItem
						titleKey="home"
						url="/Home"
						iosIcon={homeOutline}
						mdIcon={homeSharp}
						location={location}
					/>
					{user && (
						<AppMenuItem
							titleKey="recipe"
							url="/Recipe"
							iosIcon="chefoutline"
							mdIcon="chefsharp"
							location={location}
						/>
					)}
					{user && (
						<AppMenuItem
							titleKey="personalization"
							url="/Personalization"
							iosIcon={idCardOutline}
							mdIcon={idCardSharp}
							location={location}
						/>
					)}
					<AppMenuItem
						titleKey="settings"
						url="/Settings"
						iosIcon={settingsOutline}
						mdIcon={settingsSharp}
						location={location}
					/>
				</IonList>

				<IonList id="labels-list">
					{user ? (
						<IonMenuToggle autoHide={false} onClick={signOut}>
							<IonItem lines="none" button={true}>
								<IonIcon aria-hidden="true" slot="start" ios={logOutOutline} md={logOutSharp} />
								<IonLabel>{t('menu.logout')}</IonLabel>
							</IonItem>
						</IonMenuToggle>
					) : (
						<IonMenuToggle autoHide={false} onClick={signIn}>
							<IonItem lines="none" button={true}>
								<IonIcon aria-hidden="true" slot="start" ios={logInOutline} md={logInSharp} />
								<IonLabel>{t('menu.login')}</IonLabel>
							</IonItem>
						</IonMenuToggle>
					)}
				</IonList>
				<div className="menu-build-info ion-padding-start ion-padding-end ion-padding-bottom ion-text-center">
					v{__APP_VERSION__} ({__APP_GIT_HASH__})
				</div>
			</IonContent>
		</IonMenu>
	);
};

export default Menu;
