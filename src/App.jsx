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

function App() {
  const [session, setSession] = useState(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [todos, setTodos] = useState([])
  const [input, setInput] = useState('')
  const [description, setDescription] = useState('')
  const [filter, setFilter] = useState('all')
  const [fetchingTodos, setFetchingTodos] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      updateSDKUserId(session?.user?.email)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      updateSDKUserId(session?.user?.email)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchTodos()
    } else {
      setTodos([])
    }
  }, [session])

  function updateSDKUserId(userId) {
    // Look for the Feature Studio script tag
    const script = document.querySelector('script[data-api-key]');
    if (script) {
      if (userId) {
        script.setAttribute('data-user-id', userId);
      } else {
        script.setAttribute('data-user-id', 'anonymous');
      }
      // If the SDK has a global re-init function, call it. 
      // Otherwise, the page refresh might be needed, but we'll try to just dispatch an event in case SDK listens
      window.dispatchEvent(new CustomEvent('feature-studio-user-changed', { detail: { userId } }));
      
      // Force a reload of flags if FeatureStudio exists
      if (window.FeatureStudio && window.FeatureStudio.flags) {
        const apiKey = script.getAttribute('data-api-key');
        const host = 'https://scratch-ten-taupe.vercel.app';
        fetch(`${host}/api/v1/flags/evaluate?api_key=${encodeURIComponent(apiKey)}&user_id=${encodeURIComponent(userId || 'anonymous')}`, {
          method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.flags) {
            window.FeatureStudio.flags = data.flags;
            window.dispatchEvent(new CustomEvent('feature-studio-flags-loaded'));
          }
        })
        .catch(err => console.error('Failed to reload flags', err));
      }
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    })
    if (error) setAuthError(error.message)
    else setAuthError('Check your email for the login link!')
    setAuthLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })
    if (error) setAuthError(error.message)
    setAuthLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function fetchTodos() {
    setFetchingTodos(true)
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) {
      setTodos(data)
    }
    setFetchingTodos(false)
  }

  async function addTodo(e) {
    e.preventDefault()
    if (!input.trim() || !session) return
    
    // Optimistic update
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

    const { error } = await supabase
      .from('todos')
      .insert([{
        user_id: session.user.id,
        text: newTodo.text,
        description: newTodo.description,
        completed: false
      }])
    
    if (error) {
      console.error(error);
      fetchTodos(); // Revert on failure
    }
  }

  async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistic
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error(error);
      fetchTodos();
    }
  }

  async function deleteTodo(id) {
    // Optimistic
    setTodos(todos.filter(t => t.id !== id))

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)

    if (error) {
      console.error(error);
      fetchTodos();
    }
  }

  const filteredTodos = todos.filter(t => {
    if (filter === 'active') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const totalCount = todos.length
  const doneCount = todos.filter(t => t.completed).length
  const activeCount = totalCount - doneCount

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
  const descriptionFieldEnabled = useFeatureFlag('task-description-field');
  const downloadCsvEnabled = useFeatureFlag('download-csv-button');

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
          <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>
        </div>
        <p>Stay organized, get things done</p>
      </header>

      {/* Stats */}
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

      {/* Add Todo */}
      <form className="add-todo" onSubmit={addTodo}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
        />
        {descriptionFieldEnabled && (
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description (optional)"
          />
        )}
        <button type="submit">Add</button>
        {downloadCsvEnabled && (
          <button type="button" onClick={downloadCSV}>Download CSV</button>
        )}
      </form>

      {/* Filters */}
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

      {/* Todo List */}
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
              {descriptionFieldEnabled && todo.description && (
                <span className="description">{todo.description.length > 100 ? `${todo.description.substring(0, 100)}...` : todo.description}</span>
              )}
              {copyButtonEnabled && (
                <button className="copy-btn" onClick={() => copyToClipboard(todo.text)}>📋</button>
              )}
              <button className="delete-btn" onClick={() => deleteTodo(todo.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}

      {/* Footer with SDK badge */}
      <footer className="footer">
        <p>Powered by Feature Studio</p>
        <div className="sdk-badge">⚡ Feature Studio SDK Active</div>
      </footer>
    </div>
  )
}

export default App