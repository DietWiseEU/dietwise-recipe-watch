import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route } from 'react-router-dom';
import Menu from '@/components/Menu';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
// import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import '@ionic/react/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

import './App.css';

// importing the top-level page components; let's keep them sorted allphabetically
import AuthCallbackPage from '@/auth/AuthCallbackPage';
import EndSessionPage from '@/auth/EndSessionPage';
import HomePage from '@/home/HomePage';
import PersonalizationPage from '@/personalization/PersonalizationPage';
import RecipePage from '@/recipe/RecipePage';
import SettingsPage from '@/settings/SettingsPage';

setupIonicReact();

const App: React.FC = () => {
	const routerBase = import.meta.env.BASE_URL;
	const basename = routerBase === '/' ? undefined : routerBase.replace(/\/$/, '');

	return (
		<IonApp>
			<IonReactRouter basename={basename}>
				<IonSplitPane contentId="main" when="(min-width: 3000px)">
					<Menu />
					<IonRouterOutlet id="main">
						<Route path="/" element={<Navigate to="/Home" replace />} />
						<Route path="/authcallback" element={<AuthCallbackPage />} />
						<Route path="/endsession" element={<EndSessionPage />} />
						<Route path="/Home" element={<HomePage />} />
						<Route path="/Recipe" element={<RecipePage />} />
						<Route path="/Personalization" element={<PersonalizationPage />} />
						<Route path="/Settings" element={<SettingsPage />} />
					</IonRouterOutlet>
				</IonSplitPane>
			</IonReactRouter>
		</IonApp>
	);
};

export default App;
