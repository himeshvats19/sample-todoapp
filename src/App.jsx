import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [todos, setTodos] = useState(() => {
    const saved = localStorage.getItem('todos')
    return saved ? JSON.parse(saved) : []
  })
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  function addTodo(e) {
    e.preventDefault()
    if (!input.trim()) return
    setTodos([
      { id: Date.now(), text: input.trim(), completed: false },
      ...todos,
    ])
    setInput('')
  }

  function toggleTodo(id) {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  function deleteTodo(id) {
    setTodos(todos.filter(t => t.id !== id))
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
      'Todo Item,Creation Date,Status\n' +
      todos.map(t => `${t.text},${new Date(t.id).toLocaleString()},${t.completed ? 'Completed' : 'Active'}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'todos.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Download complete!');
  }

  return (
    <div className="app">
      <header className="header">
        <h1>✨ Todo App</h1>
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
        <button type="submit">Add</button>
        <button type="button" onClick={downloadCSV}>Download CSV</button>
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
      {filteredTodos.length === 0 ? (
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
        <table className="todo-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Description</th>
              <th>Creation Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTodos.map(todo => (
              <tr key={todo.id} className="todo-item">
                <td>{todo.text}</td>
                <td>{todo.description || 'No description'}</td>
                <td>{new Date(todo.id).toLocaleString()}</td>
                <td>
                  <button onClick={() => toggleTodo(todo.id)}>Mark as Done</button>
                  <button onClick={() => deleteTodo(todo.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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