import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function useFeatureFlag(flagKey) {
  const [enabled, setEnabled] = useState(!!window.FeatureStudio?.flags?.[flagKey]);
  useEffect(() => {
    const handleFlags = () => setEnabled(!!window.FeatureStudio?.flags?.[flagKey]);
    window.addEventListener('feature-studio-flags-loaded', handleFlags);
    handleFlags();
    return () => window.removeEventListener('feature-studio-flags-loaded', handleFlags);
  }, [flagKey]);
  return enabled;
}

function HeaderDigitalClock() {
  const isEnabled = useFeatureFlag('header-digital-clock')
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  )

  useEffect(() => {
    if (!isEnabled) return undefined

    const intervalId = window.setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isEnabled])

  if (!isEnabled) return null

  return (
    <div className="header-clock" aria-label="Current time" title="Current local time">
      <span className="header-clock-label">Time</span>
      <span className="header-clock-value">{currentTime}</span>
    </div>
  )
}

function RichTextEditor({ value, onChange }) {
  const formatText = (format) => {
    const textarea = document.getElementById('description-editor');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let formattedText;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        break;
      case 'bullet':
        formattedText = `• ${selectedText}`;
        break;
      default:
        return;
    }

    onChange(textarea.value.replace(selectedText, formattedText));
  };

  return (
    <div>
      <div>
        <button onClick={() => formatText('bold')}>Bold</button>
        <button onClick={() => formatText('italic')}>Italic</button>
        <button onClick={() => formatText('underline')}>Underline</button>
        <button onClick={() => formatText('bullet')}>Bullet</button>
      </div>
      <textarea
        id="description-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a description (optional)"
      />
    </div>
  );
}

function App() {
  const [session, setSession] = useState({
    user: {
      id: 'demo-user-id',
      email: 'demo@featurestudio.dev',
    },
  })
  const [authEmail, setAuthEmail] = useState('demo@featurestudio.dev')
  const [authPassword, setAuthPassword] = useState('password123')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [todos, setTodos] = useState([
    {
      id: '1',
      user_id: 'demo-user-id',
      text: 'Review today\'s priorities',
      description: 'Check deadlines and organize the most important tasks first.',
      completed: false,
      created_at: '2026-03-15T09:00:00.000Z',
    },
    {
      id: '2',
      user_id: 'demo-user-id',
      text: 'Prepare product update notes',
      description: 'Summarize the latest improvements for the team sync.',
      completed: true,
      created_at: '2026-03-14T14:30:00.000Z',
    },
    {
      id: '3',
      user_id: 'demo-user-id',
      text: 'Plan next sprint tasks',
      description: 'Outline upcoming work items and estimate effort.',
      completed: false,
      created_at: '2026-03-13T11:15:00.000Z',
    },
  ])
  const [input, setInput] = useState('')
  const [description, setDescription] = useState('')
  const [filter, setFilter] = useState('all')
  const [fetchingTodos, setFetchingTodos] = useState(false)

  useEffect(() => {
    updateSDKUserId(session?.user?.email)
  }, [session])

  function updateSDKUserId(userId) {
    const script = document.querySelector('script[data-api-key]');
    if (script) {
      if (userId) {
        script.setAttribute('data-user-id', userId);
      } else {
        script.setAttribute('data-user-id', 'anonymous');
      }
      window.dispatchEvent(new CustomEvent('feature-studio-user-changed', { detail: { userId } }));
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setTimeout(() => {
      setAuthError('Demo mode: sign up is disabled in preview.')
      setAuthLoading(false)
    }, 300)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    setTimeout(() => {
      setSession({
        user: {
          id: 'demo-user-id',
          email: authEmail || 'demo@featurestudio.dev',
        },
      })
      setAuthLoading(false)
    }, 300)
  }

  async function handleSignOut() {
    setSession(null)
  }

  async function fetchTodos() {
    setFetchingTodos(false)
  }

  async function addTodo(e) {
    e.preventDefault()
    if (!input.trim() || !session) return

    const newTodo = {
      id: crypto.randomUUID(),
      user_id: session.user.id,
      text: input.trim(),
      description: description.trim(),
      completed: false,
      created_at: new Date().toISOString()
    };
    setTodos([newTodo, ...todos])
    setInput('')
    setDescription('')
  }

  async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  async function deleteTodo(id) {
    setTodos(todos.filter(t => t.id !== id))
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const totalCount = todos.length;
  const doneCount = todos.filter(t => t.completed).length;
  const activeCount = totalCount - doneCount;

  function downloadCSV() {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Todo Item,Description,Creation Date,Status\n' +
      todos.map(t => `${t.text},${t.description},${new Date(t.created_at).toLocaleString()},${t.completed ? 'Completed' : 'Active'}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'todos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Download complete!');
  }

  const copyButtonEnabled = useFeatureFlag('copy-button-for-tasks');
  const downloadCsvEnabled = useFeatureFlag('download-csv-button');
  const richTextEditorEnabled = useFeatureFlag('rich-text-editor-for-todo-item');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied');
  };

  if (!session) {
    return (
      <div className="app flex-center">
        <div className="auth-card">
          <h1>✨ Todo App Login</h1>
          <p>Sign in to sync your tasks to the cloud.</p>
          <form className="auth-form" onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
            />
            {authError && <div className="auth-error">{authError}</div>}
            <div className="auth-buttons">
              <button type="submit" disabled={authLoading}>Login</button>
              <button type="button" className="secondary" onClick={handleSignUp} disabled={authLoading}>Sign Up</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-top">
          <h1>✨ Todo App</h1>
          <div className="header-actions">
            <HeaderDigitalClock />
            <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>
        <p>Stay organized, get things done</p>
      </header>

      <div className="stats">
        <div className="stat-card">
          <div className="number">{totalCount}</div>
          <div className="label">Total</div>
        </div>
        <div className="stat-card">
          <div className="number">{activeCount}</div>
          <div className="label">Active</div>
        </div>
        <div className="stat-card">
          <div className="number">{doneCount}</div>
          <div className="label">Done</div>
        </div>
      </div>

      <form className="add-todo" onSubmit={addTodo}>
        {richTextEditorEnabled ? (
          <RichTextEditor value={input} onChange={setInput} />
        ) : (
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />)}
        <button type="submit">Add</button>
        {downloadCsvEnabled && (
          <button type="button" onClick={downloadCSV}>Download CSV</button>
        )}
      </form>

      <div className="filters">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {fetchingTodos ? (
        <div className="empty-state"><p>Loading tasks...</p></div>
      ) : filteredTodos.length === 0 ? (
        <div className="empty-state">
          <div className="emoji">{filter === 'completed' ? '🎯' : '📝'}</div>
          <p>
            {filter === 'completed'
              ? 'No completed tasks yet'
              : filter === 'active'
                ? 'All tasks done! 🎉'
                : 'Add your first todo above'}
          </p>
        </div>
      ) : (
        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li key={todo.id} className="todo-item">
              <div
                className={`checkbox ${todo.completed ? 'checked' : ''}`}
                onClick={() => toggleTodo(todo.id)}
              />
              <span className={`text ${todo.completed ? 'completed' : ''}`}>{todo.text}</span>
              {copyButtonEnabled && (
                <button className="copy-btn" onClick={() => copyToClipboard(todo.text)}>📋</button>
              )}
              <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      <footer className="footer">
        <p>Powered by Feature Studio</p>
        <div className="sdk-badge">⚡ Feature Studio SDK Active</div>
      </footer>
    </div>
  );
}

export default App;
