import { useState, useEffect, useCallback } from 'react';
import { useT } from '../../i18n/useT';
import type { TKey } from '../../i18n/en';

const ONBOARDING_KEY = 'mindonwall-onboarding-done';

interface StepConfig {
  key: TKey;
  color: string;
  target: string;
}

const STEPS: StepConfig[] = [
  { key: 'ob.step1', color: '#4A90D9', target: 'add' },
  { key: 'ob.step2', color: '#E8A87C', target: 'rope' },
  { key: 'ob.step3', color: '#6C5CE7', target: 'map' },
];

export function Onboarding() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (done) return;
    const timer = setTimeout(() => {
      setStep(1);
      setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const findTarget = useCallback(() => {
    if (step === 0) return;
    const currentStep = STEPS[step - 1];
    const targetEl = document.querySelector(`[data-onboarding-target="${currentStep.target}"]`);
    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(rect);
      }
    }
  }, [step]);

  useEffect(() => {
    if (!visible) return;
    let attempts = 0;
    const interval = setInterval(() => {
      findTarget();
      attempts++;
      if (attempts > 10) clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, [step, visible, findTarget]);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const handleSkip = () => {
    finish();
  };

  const finish = () => {
    setVisible(false);
    localStorage.setItem(ONBOARDING_KEY, '1');
  };

  if (!visible || step === 0) return null;

  const current = STEPS[step - 1];

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2000,
    pointerEvents: 'auto',
  };

  if (targetRect) {
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetTop = targetRect.top;
    const targetBottom = targetRect.bottom;
    const isTargetInLowerHalf = targetTop > window.innerHeight / 2;

    if (isTargetInLowerHalf) {
      // Target in lower half: bubble appears above target, arrow points down
      bubbleStyle.bottom = window.innerHeight - targetTop + 16;
      bubbleStyle.left = targetCenterX;
      bubbleStyle.transform = 'translateX(-50%)';
    } else {
      // Target in upper half: bubble appears below target, arrow points up
      bubbleStyle.top = targetBottom + 16;
      bubbleStyle.left = targetCenterX;
      bubbleStyle.transform = 'translateX(-50%)';
    }
  } else {
    bubbleStyle.bottom = 100;
    bubbleStyle.left = '50%';
    bubbleStyle.transform = 'translateX(-50%)';
  }

  const highlightStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1999,
    pointerEvents: 'none',
    border: `2px solid ${current.color}`,
    borderRadius: 8,
    boxShadow: `0 0 0 4px rgba(255,255,255,0.8), 0 0 20px ${current.color}40`,
    transition: 'all 0.3s ease',
  };

  if (targetRect) {
    highlightStyle.top = targetRect.top - 4;
    highlightStyle.left = targetRect.left - 4;
    highlightStyle.width = targetRect.width + 8;
    highlightStyle.height = targetRect.height + 8;
  } else {
    highlightStyle.display = 'none';
  }

  const isTargetInLowerHalf = targetRect ? targetRect.top > window.innerHeight / 2 : false;

  return (
    <>
      <div style={highlightStyle} />
      <div style={bubbleStyle}>
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E5E5E5',
            borderRadius: 16,
            padding: '20px 24px 16px',
            minWidth: 280,
            maxWidth: 340,
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            animation: 'fadeInUp 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: s === step ? current.color : '#DDD',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5, marginBottom: 16 }}>
            {t(current.key)}
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '6px 16px',
                fontSize: 12,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
              }}
            >
              {t('ob.skip')}
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '6px 20px',
                fontSize: 12,
                color: '#FFF',
                background: current.color,
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              {step < 3 ? t('ob.next') : t('ob.done')}
            </button>
          </div>
        </div>
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: isTargetInLowerHalf ? '8px solid #FFFFFF' : 'none',
            borderBottom: isTargetInLowerHalf ? 'none' : '8px solid #FFFFFF',
            margin: '0 auto',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.06))',
          }}
        />
      </div>
    </>
  );
}
