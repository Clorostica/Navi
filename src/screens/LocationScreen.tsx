import { useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import StationBrowser from '../components/StationBrowser';
import { copy } from '../content/copy';
import { uBahnLines } from '../data/berlinUBahn';
import { findNearestStation, type Station } from '../data/stations';
import { useApp } from '../state/AppContext';

type Stage = 'choose' | 'asking' | 'confirmNearest' | 'unavailable' | 'manual';

export default function LocationScreen() {
  const { goBack, navigate, updateDraft } = useApp();
  const c = copy.location;

  const [stage, setStage] = useState<Stage>('choose');
  const [nearestStation, setNearestStation] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    setStage('asking');
    if (!('geolocation' in navigator)) {
      setStage('unavailable');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nearest = findNearestStation(position.coords.latitude, position.coords.longitude);
        setNearestStation(nearest.name);
        setStage('confirmNearest');
      },
      () => setStage('unavailable'),
      { timeout: 8000 },
    );
  };

  const confirmStation = (stationName: string) => {
    updateDraft({ station: stationName, locationMethod: nearestStation === stationName ? 'current' : 'manual' });
    navigate('reportDetails');
  };

  return (
    <div className="screen">
      <ScreenHeader title={c.title} onBack={goBack} />
      <div className="screen-body">
        <p className="subtext">{c.explanation}</p>

        {stage === 'choose' && (
          <>
            <button type="button" className="btn btn-primary" onClick={handleUseCurrentLocation}>
              {c.useCurrentLocation}
            </button>
            <div className="divider">or</div>
            <button type="button" className="btn btn-secondary" onClick={() => setStage('manual')}>
              {c.manualSelection.title}
            </button>
          </>
        )}

        {stage === 'asking' && (
          <div className="card">
            <h2>{c.permission.title}</h2>
            <p>{c.permission.body}</p>
          </div>
        )}

        {stage === 'confirmNearest' && nearestStation && (
          <div className="card">
            <p>{c.nearestStation.result.replace('{station}', nearestStation)}</p>
            <button type="button" className="btn btn-primary" onClick={() => confirmStation(nearestStation)}>
              {c.nearestStation.confirm}
            </button>
            <button type="button" className="link-button" onClick={() => setStage('manual')}>
              {c.nearestStation.change}
            </button>
          </div>
        )}

        {stage === 'unavailable' && (
          <div className="card">
            <p className="error-text">{c.locationUnavailable}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setStage('manual')}>
              {c.manualSelection.title}
            </button>
          </div>
        )}

        {stage === 'manual' && (
          <StationBrowser
            onSelect={(station: Station) => confirmStation(station.name)}
            placeholder={c.search.placeholder}
            initialLine={uBahnLines[0].id}
          />
        )}
      </div>
    </div>
  );
}
