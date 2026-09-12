import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calculator, Trash2, RefreshCw, X, ShieldAlert } from 'lucide-react';

interface ClearDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

interface MathProblem {
  numA: number;
  numB: number;
  operation: '+' | '-' | '×';
  expected: number;
}

export const ClearDataModal: React.FC<ClearDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}) => {
  const [problem, setProblem] = useState<MathProblem>({ numA: 7, numB: 5, operation: '+', expected: 12 });
  const [userAnswer, setUserAnswer] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateProblem = () => {
    const ops: Array<'+' | '-' | '×'> = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let a = Math.floor(Math.random() * 12) + 3; // 3 to 14
    let b = Math.floor(Math.random() * 9) + 2;  // 2 to 10
    let expected = 0;

    if (op === '+') {
      expected = a + b;
    } else if (op === '-') {
      // Ensure positive result
      if (a < b) {
        const temp = a;
        a = b;
        b = temp;
      }
      if (a === b) a += 3;
      expected = a - b;
    } else {
      // Multiplication with small numbers
      a = Math.floor(Math.random() * 7) + 2; // 2 to 8
      b = Math.floor(Math.random() * 6) + 2; // 2 to 7
      expected = a * b;
    }

    setProblem({ numA: a, numB: b, operation: op, expected });
    setUserAnswer('');
    setErrorMsg(null);
  };

  useEffect(() => {
    if (isOpen) {
      generateProblem();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = parseInt(userAnswer.trim(), 10);
    if (isNaN(parsed)) {
      setErrorMsg('Por favor, digite um número como resultado.');
      return;
    }

    if (parsed !== problem.expected) {
      setErrorMsg(`Resultado incorreto! ${problem.numA} ${problem.operation} ${problem.numB} não é ${parsed}. Tente resolver a nova conta.`);
      generateProblem();
      return;
    }

    // Answer is correct, proceed with clearing
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Erro na limpeza:', err);
      setErrorMsg('Ocorreu um erro ao limpar os dados. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-rose-200 overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Confirmação de Limpeza</h3>
              <p className="text-[11px] text-rose-100">Exclusão irreversível dos agendamentos</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-900 space-y-1">
              <p className="font-bold">Atenção: Ação Destrutiva</p>
              <p className="text-rose-800 leading-relaxed">
                Esta ação apagará <strong>todos os agendamentos</strong> registrados no sistema e no banco de dados. Os horários ficarão completamente livres.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calculator className="w-4 h-4 text-blue-600" />
              <span>Para confirmar, resolva a conta abaixo:</span>
            </div>

            {/* Arithmetic display */}
            <div className="flex items-center justify-center gap-3">
              <div className="bg-white border-2 border-slate-300 rounded-xl px-5 py-2.5 shadow-2xs">
                <span className="text-2xl font-black font-mono text-slate-900 tracking-wider">
                  {problem.numA} {problem.operation} {problem.numB} = ?
                </span>
              </div>
              <button
                type="button"
                onClick={generateProblem}
                title="Mudar conta"
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Answer input */}
            <div>
              <label htmlFor="clear-data-math-answer" className="sr-only">
                Resposta da conta
              </label>
              <input
                id="clear-data-math-answer"
                type="number"
                inputMode="numeric"
                required
                autoFocus
                placeholder="Digite a resposta"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className="w-48 text-center text-lg font-bold font-mono py-2 px-3 bg-white border-2 border-blue-400 focus:border-rose-600 focus:ring-2 focus:ring-rose-400/20 rounded-xl shadow-2xs outline-hidden"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-100/80 border border-rose-300 text-rose-800 rounded-xl text-xs font-medium animate-fade-in text-center">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              id="confirm-clear-data-math-btn"
              type="submit"
              disabled={isLoading || !userAnswer.trim()}
              className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isLoading ? 'Limpando dados...' : 'Confirmar e Limpar Tudo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
