import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';
import { leafOutline, playForwardOutline } from 'ionicons/icons';
import './HelpContentsComponent.css';

const HelpContentsComponent: React.FC = () => {
	const { t } = useTranslation();
	return (
		<div className="help ion-padding-horizontal">
			<h1 className="help__title">{t('recipe.help.title')}</h1>
			<p className="help__intro">{t('recipe.help.intro')}</p>
			{/* Safari drops the implicit list role once the markers are suppressed, hence the explicit role. */}
			<ol className="help__steps" role="list">
				<li className="help__step">
					<div className="help__step-body">
						<h2 className="help__step-title">{t('recipe.help.enterLinkTitle')}</h2>
						<p>{t('recipe.help.paragraph1')}</p>
					</div>
				</li>
				<li className="help__step">
					<div className="help__step-body">
						<h2 className="help__step-title">{t('recipe.help.twoStepsTitle')}</h2>
						<p>{t('recipe.help.paragraph2')}</p>
					</div>
				</li>
				<li className="help__step">
					<div className="help__step-body">
						<h2 className="help__step-title">{t('recipe.help.reviewSuggestionsTitle')}</h2>
						<p>{t('recipe.help.paragraph3')}</p>
						<ul className="help__options">
							<li>
								<span className="help__button help__button--accept">{t('ingredient.accept')}</span>{' '}
								<span className="help__option-text">{t('recipe.help.explainApproveButton')}</span>
							</li>
							<li>
								<span className="help__button help__button--reject">{t('ingredient.reject')}</span>{' '}
								<span className="help__option-text">{t('recipe.help.explainRejectButton')}</span>
							</li>
							<li>
								<span className="help__button help__button--skip">
									{t('ingredient.skip')}
									<IonIcon icon={playForwardOutline} aria-hidden="true" />
								</span>{' '}
								<span className="help__option-text">{t('recipe.help.explainSkipButton')}</span>
							</li>
						</ul>
						<p>{t('recipe.help.paragraph4')}</p>
						<p>{t('recipe.help.paragraph5')}</p>
						<aside className="help__callout">
							<span className="help__callout-badge" aria-hidden="true">
								€
							</span>
							<div>
								<h3 className="help__callout-title">{t('recipe.help.costTitle')}</h3>
								<p>{t('recipe.help.paragraph6')}</p>
								<p>{t('recipe.help.seasonality')}</p>
							</div>
						</aside>
					</div>
				</li>
				<li className="help__step">
					<div className="help__step-body">
						<h2 className="help__step-title">{t('recipe.help.understandScoreTitle')}</h2>
						<p>{t('recipe.help.rating')}</p>
						<aside className="help__callout">
							<span className="help__callout-badge">
								<IonIcon icon={leafOutline} aria-hidden="true" />
							</span>
							<div>
								<h3 className="help__callout-title">{t('recipe.help.inControlTitle')}</h3>
								<p>{t('recipe.help.inControl')}</p>
							</div>
						</aside>
					</div>
				</li>
			</ol>
		</div>
	);
};

export default HelpContentsComponent;
